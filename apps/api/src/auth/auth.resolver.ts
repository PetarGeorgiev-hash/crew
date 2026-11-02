import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginModel } from './models/login-input.model';
import { RegisterModel } from './models/register-input.model';
import { AuthResult } from './models/auth-result.model';
import { UserModel } from '../users/models/user.model';
import type { JwtPayload } from './types/jwt-payload.type';
import { CurrentUser } from './decorators/current-user.decorator';
import { LogoutResponse } from './models/logout-response.model';
import { Public } from './decorators/public-route.decorator';
import { VerifyEmailInput } from './models/verifyMail-input.model';
import { RefreshTokenInput } from './models/refresh-token.model';
import { WebAuthResult } from './models/web-auth-respose';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getWebAppOrigins } from '../config/web-origins';

type GraphqlContext = {
  res: ExpressResponse;
  req: ExpressRequest;
};

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private assertTrustedWebOrigin(req: ExpressRequest): void {
    const origin = req.headers.origin;
    const allowedOrigins = getWebAppOrigins(
      this.configService.get<string>('WEB_APP_ORIGINS'),
      this.configService.get<string>('NODE_ENV'),
    );

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Untrusted request origin');
    }
  }

  @Public()
  @Mutation(() => AuthResult)
  login(@Args('loginModel') loginModel: LoginModel) {
    return this.authService.login(loginModel);
  }

  @Public()
  @Mutation(() => WebAuthResult)
  async webLogin(
    @Context() context: GraphqlContext,
    @Args('loginModel') input: LoginModel,
  ): Promise<WebAuthResult> {
    this.assertTrustedWebOrigin(context.req);
    const result = await this.authService.login(input);

    const ttl = this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_DAYS');
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/graphql',
      maxAge: Number(ttl) * 86_400_000,
    };

    context.res.cookie('crew_refresh', result.refreshToken, cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Mutation(() => AuthResult)
  register(@Args('registerModel') registerModel: RegisterModel) {
    return this.authService.register(registerModel);
  }

  @Public()
  @Mutation(() => WebAuthResult)
  async webRegister(
    @Context() context: GraphqlContext,
    @Args('registerModel') registerModel: RegisterModel,
  ): Promise<WebAuthResult> {
    this.assertTrustedWebOrigin(context.req);
    const result = await this.authService.register(registerModel);

    const ttl = this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_DAYS');
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/graphql',
      maxAge: Number(ttl) * 86_400_000,
    };

    context.res.cookie('crew_refresh', result.refreshToken, cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Mutation(() => AuthResult)
  refresh(@Args('refreshTokenInput') refreshTokenInput: RefreshTokenInput) {
    return this.authService.refreshToken(refreshTokenInput.refreshToken);
  }

  @Public()
  @Mutation(() => WebAuthResult)
  async webRefresh(@Context() context: GraphqlContext): Promise<WebAuthResult> {
    this.assertTrustedWebOrigin(context.req);
    const refreshToken: unknown = context.req.cookies?.crew_refresh;

    if (
      !refreshToken ||
      typeof refreshToken != 'string' ||
      refreshToken.length === 0
    )
      throw new UnauthorizedException('Missing refresh cookie');
    const result = await this.authService.refreshToken(refreshToken);

    const ttl = this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_DAYS');
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/graphql',
      maxAge: Number(ttl) * 86_400_000,
    };

    context.res.cookie('crew_refresh', result.refreshToken, cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Mutation(() => LogoutResponse)
  logout(@CurrentUser() user: JwtPayload): Promise<LogoutResponse> {
    return this.authService.logout(user.sid);
  }

  @Mutation(() => LogoutResponse)
  async webLogout(
    @Context() context: GraphqlContext,
    @CurrentUser() user: JwtPayload,
  ): Promise<LogoutResponse> {
    this.assertTrustedWebOrigin(context.req);
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/graphql',
    };
    const res = await this.authService.logout(user.sid);
    context.res.clearCookie('crew_refresh', cookieOptions);
    return res;
  }

  @Query(() => UserModel)
  getProfile(@CurrentUser() user: JwtPayload): Promise<UserModel> {
    return this.authService.getProfile(user.sub);
  }

  @Mutation(() => Boolean)
  verifyEmail(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: VerifyEmailInput,
  ) {
    return this.authService.verifyEmail(user.sub, input.code);
  }

  @Mutation(() => Boolean)
  async resendVerifyEmail(@CurrentUser() user: JwtPayload) {
    await this.authService.resendVerifyEmail(user.sub);
    return true;
  }

  @Public()
  @Mutation(() => AuthResult)
  signInWithGoogle(@Args('idToken') idToken: string): Promise<AuthResult> {
    return this.authService.signInWithGoogle(idToken);
  }

  @Public()
  @Mutation(() => WebAuthResult)
  async webSignInWithGoogle(
    @Context() context: GraphqlContext,
    @Args('idToken') idToken: string,
  ): Promise<WebAuthResult> {
    this.assertTrustedWebOrigin(context.req);
    const result = await this.authService.signInWithGoogle(idToken);

    const ttl = this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_DAYS');
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/graphql',
      maxAge: Number(ttl) * 86_400_000,
    };

    context.res.cookie('crew_refresh', result.refreshToken, cookieOptions);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }
}
