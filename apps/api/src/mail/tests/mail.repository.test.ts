import {
  createTestUser,
  deleteTestUser,
  setupDb,
} from '../../utils/test.utils';
import { MailRepository } from '../mail.repository';
import { InsertMailVerification } from '../schema/email-verifications.schema';

describe('Mail.Repository', () => {
  const { pool, db } = setupDb();
  const repo = new MailRepository(db);

  let userId: string;
  const date = new Date(Date.now() + 60_000);
  const testMail: InsertMailVerification = {
    codeHash: 'test',
    expiresAt: date,
    toEmail: 'test',
    userId: '',
  };

  beforeAll(async () => {
    userId = await createTestUser(db);
    testMail.userId = userId;
    await repo.insert(testMail);
  });

  beforeEach(async () => {
    await repo.insert(testMail);
  });

  afterAll(async () => {
    await repo.deleteByUserId(userId);
    await deleteTestUser(db, userId);
    await pool.end();
  });

  it('should insert a new email verification', async () => {
    const mail = await repo.findByUserId(userId);
    expect(mail.userId).toBe(testMail.userId);
    expect(mail.codeHash).toBe(testMail.codeHash);
    expect(mail.attempts).toEqual(0);
    expect(mail.expiresAt).toEqual(date);
    expect(mail.toEmail).toEqual(testMail.toEmail);
  });
  it('should consume attempts', async () => {
    const attemt1 = await repo.consumeAttempt(userId, 3);
    expect(attemt1?.userId).toEqual(userId);
    expect(attemt1?.attempts).toEqual(1);

    const attempt2 = await repo.consumeAttempt(userId, 3);
    expect(attempt2?.userId).toEqual(userId);
    expect(attempt2?.attempts).toEqual(2);

    const attempt3 = await repo.consumeAttempt(userId, 3);
    expect(attempt3?.userId).toEqual(userId);
    expect(attempt3?.attempts).toEqual(3);
  });

  it('should not consume attempt', async () => {
    const attemt1 = await repo.consumeAttempt(userId, 1);
    expect(attemt1?.userId).toEqual(userId);
    expect(attemt1?.attempts).toEqual(1);

    const attempt2 = await repo.consumeAttempt(userId, 1);
    expect(attempt2).toBeNull();
  });

  it('should not allow more than maxAttempts under concurrency', async () => {
    await repo.insert(testMail);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => repo.consumeAttempt(userId, 3)),
    );

    expect(results.filter((r) => r !== null)).toHaveLength(3);
  });
  it('should replace the code on resend', async () => {
    await repo.consumeAttempt(userId, 3);
    await repo.insert({ ...testMail, codeHash: 'new-hash' });
    const mail = await repo.findByUserId(userId);
    expect(mail?.codeHash).toBe('new-hash');
    expect(mail?.attempts).toBe(0);
  });

  it('should not consume attempts on an expired code', async () => {
    await repo.insert({ ...testMail, expiresAt: new Date(Date.now() - 1000) });
    expect(await repo.consumeAttempt(userId, 3)).toBeNull();
  });

  it('should return null for an unknown user', async () => {
    expect(
      await repo.findByUserId('00000000-0000-0000-0000-000000000000'),
    ).toBeNull();
  });
});
