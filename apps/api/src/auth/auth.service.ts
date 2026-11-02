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
import { GoogleTokenInfo } from './types/google-token-info.type';

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

    const claimed = await this.refreshTokensRepository.claim(hash);

    if (!claimed) {
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

    const { accessToken, refreshToken } = await this.startSession(
      user,
      claimed.familyId,
      claimed.deviceInfo ?? undefined,
    );
    return this.toAuthResult(user, accessToken, refreshToken);
  }

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

  private async verifyGoogleIdToken(
    idToken: string,
  ): Promise<GoogleTokenInfo & { sub: string; email: string }> {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', idToken);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const claims = (await response.json()) as GoogleTokenInfo;
    const expectedClientIds = [
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_IOS_IDS'),
    ]
      .flatMap((value) => value?.split(',') ?? [])
      .map((value) => value.trim())
      .filter(Boolean);

    if (expectedClientIds.length === 0) {
      throw new Error('Configure GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS');
    }

    if (
      !expectedClientIds.includes(claims.aud ?? '') ||
      !['https://accounts.google.com', 'accounts.google.com'].includes(
        claims.iss ?? '',
      ) ||
      !claims.sub ||
      !claims.email ||
      ![true, 'true'].includes(claims.email_verified ?? false) ||
      !claims.exp ||
      Number(claims.exp) <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    return { ...claims, sub: claims.sub, email: claims.email };
  }

  async signInWithGoogle(idToken: string): Promise<AuthResult> {
    if (!idToken) {
      throw new UnauthorizedException('Invalid Google ID token');
    }
    const claims = await this.verifyGoogleIdToken(idToken);
    const email = this.normalizeEmail(claims.email);
    const userName =
      claims.name?.trim().slice(0, 255) || email.split('@')[0] || email;
    const user = await this.userService.resolveGoogleIdentity({
      email,
      providerUserId: claims.sub,
      userName,
      avatarUrl: claims.picture,
    });
    const { accessToken, refreshToken } = await this.startSession(user);
    return this.toAuthResult(user, accessToken, refreshToken);
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
