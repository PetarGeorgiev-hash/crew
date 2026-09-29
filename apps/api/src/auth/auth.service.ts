import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './types/jwt-payload.type';
import { RegisterModel } from './models/register-input.model';
import * as argon2 from 'argon2';
import { SafeUser, User } from '../users/models/user.schema';
import { LoginModel } from './models/login-input.model';
import { AuthResult } from './models/auth-result.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'ACCESS_TOKEN_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'REFRESH_TOKEN_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
    });
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
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async register(registerModel: RegisterModel): Promise<AuthResult> {
    const email = this.normalizeEmail(registerModel.email);
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser)
      throw new ConflictException('User with this email already exists');

    const passwordHash = await argon2.hash(registerModel.password);

    const user = await this.userService.createWithPassword({
      userName: registerModel.name,
      email: email,
      passwordHash: passwordHash,
    });

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const { accessToken, refreshToken } = await this.issueTokens(payload);

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(user.id, refreshTokenHash);

    return this.toAuthResult(user, accessToken, refreshToken);
  }

  async login(loginModel: LoginModel): Promise<AuthResult> {
    const email = this.normalizeEmail(loginModel.email);

    const user = await this.userService.findByEmail(email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginModel.password,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const { accessToken, refreshToken } = await this.issueTokens(payload);

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(user.id, refreshTokenHash);

    return this.toAuthResult(user, accessToken, refreshToken);
  }

  async refreshToken(refreshTokenInput: string): Promise<AuthResult> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshTokenInput,
        {
          secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isRefreshTokenValid = await argon2.verify(
      user.refreshTokenHash,
      refreshTokenInput,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newPayload: JwtPayload = { sub: user.id, email: user.email };
    const { accessToken, refreshToken } = await this.issueTokens(newPayload);

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(user.id, refreshTokenHash);

    return this.toAuthResult(user, accessToken, refreshToken);
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.userService.clearRefrehTokenHash(userId);
    return { success: true };
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.userService.toSafeUser(user);
  }
}
