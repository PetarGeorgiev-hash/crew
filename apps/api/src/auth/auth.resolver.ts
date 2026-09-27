import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginModel } from './models/login-input.model';
import { RegisterModel } from './models/register-input.model';
import { AuthResult, RefreshTokenInput } from './models/auth-result.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResult)
  async login(@Args('loginModel') loginModel: LoginModel) {
    return this.authService.login(loginModel);
  }

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
}
