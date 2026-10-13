import { BadRequestException, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

describe('AuthService email verification', () => {
  const users = {
    findById: vi.fn(),
    createWithPassword: vi.fn(),
    markVerifiedEmail: vi.fn(),
  };
  const mail = { sendVerification: vi.fn(), verify: vi.fn() };
  const jwt = { signAsync: vi.fn() };
  const refreshRepo = { create: vi.fn() };
  const config = { getOrThrow: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
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
});
