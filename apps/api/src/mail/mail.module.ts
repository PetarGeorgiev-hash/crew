import { Module } from '@nestjs/common';
import { MailProvider } from './mail.provider';
import { ConfigService } from '@nestjs/config';
import { ResendMailProvider } from './resend-mail.provider';
import { ConsoleMailProvider } from './console-mail.provider';
import { MailService } from './mail.service';
import { MailRepository } from './mail.repository';

@Module({
  providers: [
    MailRepository,
    MailService,
    {
      provide: MailProvider,
      useFactory: (configService: ConfigService): MailProvider => {
        return configService.getOrThrow<string>('MAIL_DRIVER') === 'resend'
          ? new ResendMailProvider(configService)
          : new ConsoleMailProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
