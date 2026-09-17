import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User, users } from './models/user.schema';
import { eq } from 'drizzle-orm';
import { UserModel } from './models/user.model';
import { PgUUID } from 'drizzle-orm/pg-core';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase,
  ) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async findByEmial(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findByProviderId(providerId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.providerId, providerId))
      .limit(1);
    return user;
  }

  async createWithPassword(userModel: UserModel): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        userName: userModel.userName,
      })
      .returning();

    return user;
  }

  // async createOAuthUser(userModel: UserModel): Promise<User> {
  //   const [user] = await this.db
  //     .insert(users)
  //     .values({
  //       userName: userModel.userName,
  //       avatarUrl: userModel.avatarUrl,
  //       provider: userModel.provider,
  //     })
  //     .returning();

  //   return user;
  // } figure out what should be done

  async linkProviderId(userId: PgUUID, providerId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ providerId, updatedAt: new Date() })
      .where(eq(userId, users.id));
  }

  async updateRefreshToken(
    userId: PgUUID,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async clearRefreshTokenHash(userId: PgUUID): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setResetPasswordToken(
    userId: PgUUID,
    passwordResetTokenHash: string,
    passwordResetTokenExpiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearRefrehTokenHash(userId: PgUUID): Promise<void> {
    await this.db
      .update(users)
      .set({
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setPasswordResetToken(
    userId: PgUUID,
    passwordResetTokenHash: string,
    passwordResetTokenExpiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async resetPassword(userId: PgUUID, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}
