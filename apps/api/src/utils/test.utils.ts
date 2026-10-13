import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { users } from '../users/schema/user.schema';

export const MAIL_SECRET_TEST_VALUES: Record<string, string> = {
  EMAIL_CODE_SECRET: 'secret',
  MAX_ATTEMPTS: '5',
  CODE_TTL_MS: '600000',
  RESEND_COOLDOWN_MS: '60000',
};

export function setupDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  return { db, pool };
}

export async function createTestUser(db: ReturnType<typeof setupDb>['db']) {
  const [u] = await db
    .insert(users)
    .values({ email: `test-${randomUUID()}@test.com`, userName: 'test' })
    .returning();
  return u.id;
}

export async function deleteTestUser(
  db: ReturnType<typeof setupDb>['db'],
  userId: string,
) {
  await db.delete(users).where(eq(users.id, userId));
}
