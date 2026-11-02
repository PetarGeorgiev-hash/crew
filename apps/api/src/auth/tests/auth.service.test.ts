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
        name: 'A',
        email: 'A@b.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access');
      expect(mail.sendVerification).toHaveBeenCalledWith('u1', 'a@b.com');
    } finally {
      // catch the mocked error from provider so the Termianl doesn't light up with red
      loggerError.mockRestore();
    }
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
            name: 'Person',
            picture: 'https://example.com/avatar.png',
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await service.signInWithGoogle('google-id-token');

    expect(users.resolveGoogleIdentity).toHaveBeenCalledWith({
      email: 'person@example.com',
      providerUserId: 'google-sub',
      userName: 'Person',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(refreshRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
    );
    expect(result).toMatchObject({
      user: { id: 'u1', email: 'person@example.com' },
      accessToken: 'access',
      refreshToken: expect.any(String),
    });
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
