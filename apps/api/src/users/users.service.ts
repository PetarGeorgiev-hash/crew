import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SafeUser, User, users } from './schema/user.schema';
import { and, eq, sql } from 'drizzle-orm';
import { CreateUserModel } from './models/createUser-input.model';
import { identities } from '../auth/schema/identities.schema';

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

  async findByUserName(userName: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.userName}) = ${userName.toLowerCase()}`)
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

  async resolveGoogleIdentity(input: {
    email: string;
    providerUserId: string;
    userName: string;
    avatarUrl?: string;
  }): Promise<User> {
    try {
      return await this.db.transaction(async (tx) => {
        const [identity] = await tx
          .select()
          .from(identities)
          .where(
            and(
              eq(identities.provider, 'google'),
              eq(identities.providerUserId, input.providerUserId),
            ),
          )
          .limit(1);

        if (identity) {
          const linkedUser = await tx
            .select()
            .from(users)
            .where(eq(users.id, identity.userId))
            .limit(1);
          if (linkedUser[0]) return linkedUser[0];
          throw new Error('Google identity references a missing user');
        }

        const [existingEmailUser] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingEmailUser) {
          throw new ConflictException(
            'A Crew account already exists for this email. Sign in to that account and link Google first.',
          );
        }

        const [user] = await tx
          .insert(users)
          .values({
            email: input.email,
            userName: input.userName,
            avatarUrl: input.avatarUrl,
            emailVerified: true,
          })
          .returning();

        await tx.insert(identities).values({
          userId: user.id,
          provider: 'google',
          providerUserId: input.providerUserId,
          email: input.email,
        });

        return user;
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const [identity] = await this.db
        .select()
        .from(identities)
        .where(
          and(
            eq(identities.provider, 'google'),
            eq(identities.providerUserId, input.providerUserId),
          ),
        )
        .limit(1);

      if (identity) {
        const linkedUser = await this.findById(identity.userId);
        if (linkedUser) return linkedUser;
        throw new Error('Google identity references a missing user');
      }

      const [existingEmailUser] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingEmailUser) {
        throw new ConflictException(
          'A Crew account already exists for this email. Sign in to that account and link Google first.',
        );
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as {
      code?: string;
      cause?: { code?: string };
    };
    return (candidate.code ?? candidate.cause?.code) === '23505';
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
