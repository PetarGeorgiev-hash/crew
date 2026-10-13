import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SafeUser, User, users } from './schema/user.schema';
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
    };
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
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async markVerifiedEmail(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}
