import { randomUUID } from 'crypto';
import { RefreshTokensRepository } from '../auth.repository';
import {
  createTestUser,
  deleteTestUser,
  setupDb,
} from '../../utils/test.utils';

describe('RefreshTokensRepository.claim', () => {
  const { db, pool } = setupDb();
  const repo = new RefreshTokensRepository(db);
  let userId: string;

  beforeAll(async () => {
    const id = await createTestUser(db);
    userId = id;
  });

  afterAll(async () => {
    await deleteTestUser(db, userId);
    await pool.end();
  });

  it('lets only one of two parallel claims win', async () => {
    const tokenHash = randomUUID().replace(/-/g, '');
    await repo.create({
      userId,
      familyId: randomUUID(),
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const results = await Promise.all([
      repo.claim(tokenHash),
      repo.claim(tokenHash),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('rejects an expired token', async () => {
    const tokenHash = randomUUID().replace(/-/g, '');
    await repo.create({
      userId,
      familyId: randomUUID(),
      tokenHash,
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    expect(await repo.claim(tokenHash)).toBeNull();
  });

  it('has exactly one winner in every round of parallel claims', async () => {
    for (let i = 0; i < 50; i++) {
      const tokenHash = randomUUID().replace(/-/g, '');
      await repo.create({
        userId,
        familyId: randomUUID(),
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      });

      // 5 competitors for the same token
      const results = await Promise.all(
        Array.from({ length: 5 }, () => repo.claim(tokenHash)),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
    }
  });

  it('deletes expired tokens and keeps valid ones', async () => {
    const validHash = randomUUID().replace(/-/g, '');
    const expiredHash1 = randomUUID().replace(/-/g, '');
    const expiredHash2 = randomUUID().replace(/-/g, '');

    const base = { userId, familyId: randomUUID() };

    await repo.create({
      ...base,
      tokenHash: validHash,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await repo.create({
      ...base,
      tokenHash: expiredHash1,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await repo.create({
      ...base,
      tokenHash: expiredHash2,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const deleted = await repo.deleteExpired();

    expect(deleted).toBeGreaterThanOrEqual(2);
    expect(await repo.findByHash(expiredHash1)).toBeNull();
    expect(await repo.findByHash(expiredHash2)).toBeNull();
    expect(await repo.findByHash(validHash)).not.toBeNull();
  });

  it('keeps used and revoked tokens until they expire', async () => {
    const hash = randomUUID().replace(/-/g, '');
    await repo.create({
      userId,
      familyId: randomUUID(),
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await repo.claim(hash); // marks it used

    await repo.deleteExpired();

    expect(await repo.findByHash(hash)).not.toBeNull();
  });
});
