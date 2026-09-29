import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './guards/access-token.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  providers: [
    AuthService,
    AuthResolver,
    AccessTokenGuard,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AuthModule {}
