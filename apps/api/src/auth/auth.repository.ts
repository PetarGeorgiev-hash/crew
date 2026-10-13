// src/auth/refresh-tokens.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { refreshTokens } from './schema/refresh-tokens.schema';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class RefreshTokensRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase,
  ) {}

  async create(values: typeof refreshTokens.$inferInsert) {
    const [row] = await this.db
      .insert(refreshTokens)
      .values(values)
      .returning();
    return row;
  }

  async claim(tokenHash: string) {
    const [row] = await this.db
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.usedAt),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    return row ?? null;
  }

  async findByHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return row ?? null;
  }

  async revokeFamily(familyId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }

  async deleteExpired(): Promise<number> {
    const rows = await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning({ id: refreshTokens.id });
    return rows.length;
  }
}
