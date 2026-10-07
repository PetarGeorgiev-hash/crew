import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailProvider } from './mail.provider';

@Injectable()
export class ConsoleMailProvider extends MailProvider {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `\n--- EMAIL ---\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n-------------`,
    );
    return Promise.resolve();
  }
}
