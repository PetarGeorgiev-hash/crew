import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const users = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUserName: vi.fn(),
    createWithPassword: vi.fn(),
    markVerifiedEmail: vi.fn(),
    resolveGoogleIdentity: vi.fn(),
  };
  const mail = { sendVerification: vi.fn(), verify: vi.fn() };
  const jwt = { signAsync: vi.fn() };
  const refreshRepo = { create: vi.fn() };
  const config = { get: vi.fn(), getOrThrow: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    config.get.mockReturnValue('x');
    config.getOrThrow.mockImplementation((key: string) =>
      key === 'REFRESH_TOKEN_TTL_DAYS' ? '60' : 'x',
    );
    jwt.signAsync.mockResolvedValue('access');
    refreshRepo.create.mockResolvedValue(undefined);
    service = new AuthService(
      jwt as never,
      users as never,
      config as never,
      mail as never,
      refreshRepo as never,
    );
  });

  it('should mark the user verified on a correct code', async () => {
    users.findById.mockResolvedValue({ id: 'u1', emailVerified: false });
    mail.verify.mockResolvedValue(true);

    expect(await service.verifyEmail('u1', '123456')).toBe(true);
    expect(users.markVerifiedEmail).toHaveBeenCalledWith('u1');
  });

  it('should reject a wrong code and does not mark verified', async () => {
    users.findById.mockResolvedValue({ id: 'u1', emailVerified: false });
    mail.verify.mockResolvedValue(false);

    await expect(service.verifyEmail('u1', '000000')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(users.markVerifiedEmail).not.toHaveBeenCalled();
  });

  it('should do nothing when already verified', async () => {
    users.findById.mockResolvedValue({ id: 'u1', emailVerified: true });

    expect(await service.verifyEmail('u1', '123456')).toBe(true);
    expect(mail.verify).not.toHaveBeenCalled();
  });

  it('should not resend to an already verified user', async () => {
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
    });

    await service.resendVerifyEmail('u1');
    expect(mail.sendVerification).not.toHaveBeenCalled();
  });

  it('should still registers when the verification email fails', async () => {
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    users.createWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      userName: 'A',
    });
    mail.sendVerification.mockRejectedValue(new Error('provider down'));

    try {
      const result = await service.register({
        username: 'A_User',
        email: 'A@b.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access');
      expect(users.createWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ userName: 'a_user', email: 'a@b.com' }),
      );
      expect(mail.sendVerification).toHaveBeenCalledWith('u1', 'a@b.com');
    } finally {
      // catch the mocked error from provider so the Termianl doesn't light up with red
      loggerError.mockRestore();
    }
  });

  it('rejects a username that is already taken, ignoring case', async () => {
    users.createWithPassword.mockRejectedValue({
      code: '23505',
      constraint: 'users_user_name_lower_unique',
    });
    users.findByEmail.mockResolvedValue(undefined);
    users.findByUserName.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        username: 'CrewUser',
        email: 'new@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      message: 'This username is already taken',
    });
    expect(users.findByUserName).toHaveBeenCalledWith('crewuser');
  });

  it('verifies Google claims, resolves the identity, and issues Crew tokens', async () => {
    const user = {
      id: 'u1',
      email: 'person@example.com',
      userName: 'Person',
      avatarUrl: 'https://example.com/avatar.png',
      emailVerified: true,
    };
    users.resolveGoogleIdentity.mockResolvedValue(user);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            aud: 'x',
            iss: 'https://accounts.google.com',
            exp: String(Math.floor(Date.now() / 1000) + 300),
            sub: 'google-sub',
            email: 'Person@Example.com',
            email_verified: 'true',
            picture: 'https://example.com/avatar.png',
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await service.signInWithGoogle('google-id-token');

    expect(users.resolveGoogleIdentity).toHaveBeenCalledOnce();
    const resolvedIdentity: unknown =
      users.resolveGoogleIdentity.mock.calls[0]?.[0];
    if (
      typeof resolvedIdentity !== 'object' ||
      resolvedIdentity === null ||
      !('userName' in resolvedIdentity)
    ) {
      throw new Error('Google identity was not resolved');
    }
    expect(resolvedIdentity).toMatchObject({
      email: 'person@example.com',
      providerUserId: 'google-sub',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(resolvedIdentity.userName).toMatch(/^person_[a-f0-9]{12}$/);
    expect(refreshRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    );
    expect(result).toMatchObject({
      user: { id: 'u1', email: 'person@example.com' },
      accessToken: 'access',
    });
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejects unverified Google email claims before resolving an account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            aud: 'x',
            iss: 'https://accounts.google.com',
            exp: String(Math.floor(Date.now() / 1000) + 300),
            sub: 'google-sub',
            email: 'person@example.com',
            email_verified: 'false',
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      service.signInWithGoogle('google-id-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.resolveGoogleIdentity).not.toHaveBeenCalled();
  });

  it('propagates the existing-account linking conflict', async () => {
    users.resolveGoogleIdentity.mockRejectedValue(
      new ConflictException('Sign in to the existing account first'),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            aud: 'x',
            iss: 'https://accounts.google.com',
            exp: String(Math.floor(Date.now() / 1000) + 300),
            sub: 'google-sub',
            email: 'person@example.com',
            email_verified: 'true',
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      service.signInWithGoogle('google-id-token'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(refreshRepo.create).not.toHaveBeenCalled();
  });
});
