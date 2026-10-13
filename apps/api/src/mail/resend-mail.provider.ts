import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailProvider } from './mail.provider';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendMailProvider extends MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(config: ConfigService) {
    super();
    this.resend = new Resend(config.getOrThrow<string>('EMAIL_RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async send(message: MailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      this.logger.error(`Resend failed: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
