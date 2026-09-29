import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginModel } from './models/login-input.model';
import { RegisterModel } from './models/register-input.model';
import { AuthResult, RefreshTokenInput } from './models/auth-result.model';
import { UserModel } from '../users/models/user.model';
import type { JwtPayload } from './types/jwt-payload.type';
import { CurrentUser } from './decorators/current-user.decorator';
import { LogoutResponse } from './models/logout-response.model';
import { Public } from './decorators/public-route.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResult)
  async login(@Args('loginModel') loginModel: LoginModel) {
    return this.authService.login(loginModel);
  }

  @Public()
  @Mutation(() => AuthResult)
  async register(@Args('registerModel') registerModel: RegisterModel) {
    return this.authService.register(registerModel);
  }

  @Mutation(() => AuthResult)
  async refresh(
    @Args('refreshTokenInput') refreshTokenInput: RefreshTokenInput,
  ) {
    return this.authService.refreshToken(refreshTokenInput.refreshToken);
  }

  @Mutation(() => LogoutResponse)
  async logout(@CurrentUser() user: JwtPayload): Promise<LogoutResponse> {
    return this.authService.logout(user.sub);
  }

  @Query(() => UserModel)
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserModel> {
    return this.authService.getProfile(user.sub);
  }
}
