import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './guards/access-token.guard';
import { APP_GUARD } from '@nestjs/core';
import { RefreshTokensRepository } from './auth.repository';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, MailModule, JwtModule.register({})],
  providers: [
    AuthService,
    AuthResolver,
    AccessTokenGuard,
    RefreshTokensRepository,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AuthModule {}
