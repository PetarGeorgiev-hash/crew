import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailRepository } from './mail.repository';
import { MailProvider } from './mail.provider';
import { ConfigService } from '@nestjs/config';
import { codesMatch, generateCode, hashCode } from '../utils/email-code';

@Injectable()
export class MailService {
  private readonly secret: string;
  private readonly maxAttempts: number;
  private readonly codeTtlMs: number;
  private readonly resendCooldownMs: number;
  constructor(
    private readonly repo: MailRepository,
    private readonly provider: MailProvider,
    private readonly configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('EMAIL_CODE_SECRET');
    this.maxAttempts = this.positiveNumber('MAX_ATTEMPTS');
    this.codeTtlMs = this.positiveNumber('CODE_TTL_MS');
    this.resendCooldownMs = this.positiveNumber('RESEND_COOLDOWN_MS');
  }

  private positiveNumber(key: string): number {
    const value = Number(this.configService.getOrThrow<string>(key));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number`);
    }
    return value;
  }

  async sendVerification(userId: string, email: string): Promise<void> {
    const existing = await this.repo.findByUserId(userId);
    if (
      existing &&
      Date.now() - existing.lastSentAt.getTime() < this.resendCooldownMs
    ) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateCode();
    await this.repo.insert({
      userId,
      toEmail: email,
      codeHash: hashCode(this.secret, userId, code),
      expiresAt: new Date(Date.now() + this.codeTtlMs),
    });

    await this.provider.send({
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}. It expires in ${Math.round(this.codeTtlMs / 60_000)} minutes.`,
    });
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const row = await this.repo.consumeAttempt(userId, this.maxAttempts);
    if (!row) return false;
    const hash = hashCode(this.secret, userId, code);
    if (!codesMatch(row.codeHash, hash)) return false;

    await this.repo.deleteByUserId(userId);
    return true;
  }
}
