import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './types/jwt-payload.type';
import { RegisterModel } from './models/register-input.model';
import * as argon2 from 'argon2';
import { SafeUser, User } from '../users/schema/user.schema';
import { LoginModel } from './models/login-input.model';
import { AuthResult } from './models/auth-result.model';
import { RefreshTokensRepository } from './auth.repository';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // SHA-256 is fine here: the refresh token is 32 random bytes,
  // so it can't be guessed. (argon2 is only for passwords.)
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'ACCESS_TOKEN_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      algorithms: ['HS256'],
    });
  }

  /**
   * Creates a login session:
   * 1. random refresh token (sent to the client)
   * 2. its hash saved in refresh_tokens (never the token itself)
   * 3. access token carrying the user id (sub) and session id (sid)
   *
   * familyId: omit for a new login, pass the existing one when refreshing.
   */
  private async startSession(
    user: User,
    familyId: string = randomUUID(),
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const ttlDays = Number(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_DAYS'),
    );

    const refreshToken = randomBytes(32).toString('base64url');

    await this.refreshTokensRepository.create({
      userId: user.id,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      deviceInfo,
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
    });

    const accessToken = await this.generateAccessToken({
      sub: user.id,
      sid: familyId,
    });

    return { accessToken, refreshToken };
  }

  private toAuthResult(
    user: User,
    accessToken: string,
    refreshToken: string,
  ): AuthResult {
    return {
      user: {
        id: user.id,
        email: user.email,
        userName: user.userName,
        avatarUrl: user.avatarUrl ?? undefined,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  private isUniqueViolation(e: unknown): boolean {
    const err = e as { code?: string; cause?: { code?: string } };
    return (err?.code ?? err?.cause?.code) === '23505';
  }

  async register(registerModel: RegisterModel): Promise<AuthResult> {
    const email = this.normalizeEmail(registerModel.email);
    const passwordHash = await argon2.hash(registerModel.password);

    // No findByEmail pre-check: the unique index on email is the real
    // guard, and checking first has a race. We catch its error instead.
    let user: User;
    try {
      user = await this.userService.createWithPassword({
        userName: registerModel.name,
        email,
        passwordHash,
      });
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('User with this email already exists');
      }
      throw e;
    }

    const { accessToken, refreshToken } = await this.startSession(user);
    try {
      await this.mailService.sendVerification(user.id, user.email);
    } catch (e) {
      this.logger.error(
        `Failed to send verification email for user ${user.id}`,
        e instanceof Error ? e.stack : String(e),
      );
    }
    return this.toAuthResult(user, accessToken, refreshToken);
  }

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user) throw new BadRequestException('User does not exist');

    if (user.emailVerified) return true;

    const verify = await this.mailService.verify(userId, code);
    if (!verify) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.userService.markVerifiedEmail(userId);
    return true;
  }

  async resendVerifyEmail(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user || user.emailVerified) return;
    await this.mailService.sendVerification(userId, user.email);
  }

  async login(loginModel: LoginModel): Promise<AuthResult> {
    const email = this.normalizeEmail(loginModel.email);
    const user = await this.userService.findByEmail(email);

    if (user?.passwordHash === null || user?.passwordHash === undefined) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(
      user?.passwordHash,
      loginModel.password,
    );

    if (!user || !user.passwordHash || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, refreshToken } = await this.startSession(user);
    return this.toAuthResult(user, accessToken, refreshToken);
  }

  async refreshToken(refreshTokenInput: string): Promise<AuthResult> {
    const hash = this.hashToken(refreshTokenInput);

    // Atomic: if two requests send the same token, only one gets a row.
    const claimed = await this.refreshTokensRepository.claim(hash);

    if (!claimed) {
      // Failed. If the token was real and already used, it's a replay
      // (possible theft): revoke that whole login.
      const existing = await this.refreshTokensRepository.findByHash(hash);
      if (existing?.usedAt && !existing.revokedAt) {
        await this.refreshTokensRepository.revokeFamily(existing.familyId);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findById(claimed.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Same familyId: same login, just a new token in the chain.
    const { accessToken, refreshToken } = await this.startSession(
      user,
      claimed.familyId,
      claimed.deviceInfo ?? undefined,
    );
    return this.toAuthResult(user, accessToken, refreshToken);
  }

  // Logs out this device only (sid comes from the access token).
  async logout(sid: string): Promise<{ success: true }> {
    await this.refreshTokensRepository.revokeFamily(sid);
    return { success: true };
  }

  async logoutAll(userId: string): Promise<{ success: true }> {
    await this.refreshTokensRepository.revokeAllForUser(userId);
    return { success: true };
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.userService.toSafeUser(user);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'purge-expired-refresh-tokens',
    timeZone: 'Europe/Sofia',
    waitForCompletion: true,
  })
  async purgeExpiredRefreshTokens(): Promise<void> {
    const deletedTokensCount =
      await this.refreshTokensRepository.deleteExpired();
    this.logger.log(`Deleted ${deletedTokensCount} expired refresh tokens`);
  }
}
