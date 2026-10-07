import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  emailVerifications,
  InsertMailVerification,
  MailVerification,
} from './schema/email-verifications.schema';
import { and, eq, gt, lt, sql } from 'drizzle-orm';

@Injectable()
export class MailRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase,
  ) {}

  async insert(mail: InsertMailVerification): Promise<void> {
    await this.db
      .insert(emailVerifications)
      .values(mail)
      .onConflictDoUpdate({
        target: emailVerifications.id,
        set: {
          toEmail: mail.toEmail,
          userId: mail.userId,
          attempts: 0,
          lastSentAt: new Date(),
          codeHash: mail.codeHash,
          expiresAt: mail.expiresAt,
        },
      });
  }

  async findByUserId(userId: string) {
    const [row] = await this.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, userId));
    return row ?? null;
  }

  async consumeAttempt(
    userId: string,
    maxAttempts: number,
  ): Promise<MailVerification | null> {
    const [row] = await this.db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1` })
      .where(
        and(
          eq(emailVerifications.userId, userId),
          lt(emailVerifications.attempts, maxAttempts),
          gt(emailVerifications.expiresAt, new Date()),
        ),
      )
      .returning();
    return row ?? null;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const mails = await this.db
      .delete(emailVerifications)
      .where(eq(emailVerifications.userId, userId))
      .returning();

    return mails.length;
  }
}
