import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SafeUser, User, users } from './models/user.schema';
import { eq } from 'drizzle-orm';
import { CreateUserModel } from './models/createUser-input.model';

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

  async findByEmail(email: string): Promise<User | undefined> {
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

  async createWithPassword(userModel: CreateUserModel): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        email: userModel.email,
        userName: userModel.userName,
        passwordHash: userModel.passwordHash,
      })
      .returning();

    return user;
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      providerId: user.providerId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
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

  async linkProviderId(userId: string, providerId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ providerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setResetPasswordToken(
    userId: string,
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

  async clearRefrehTokenHash(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setPasswordResetToken(
    userId: string,
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

  async resetPassword(userId: string, passwordHash: string): Promise<void> {
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
