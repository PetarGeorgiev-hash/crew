import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../src/users/schema/user.schema';
import { like } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../src/db/db-connection';

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type Tokens = { accessToken: string; refreshToken: string };

const REGISTER = `
  mutation ($input: RegisterModel!) {
    register(registerModel: $input) { accessToken refreshToken user { id email } }
  }`;

const REFRESH = `
  mutation ($input: RefreshTokenInput!) {
    refresh(refreshTokenInput: $input) { accessToken refreshToken }
  }`;

describe('Auth flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (!app) return;
    const db = app.get<NodePgDatabase>(DATABASE_CONNECTION);
    await db.delete(users).where(like(users.email, 'e2e-%@test.com'));
    await app.close();
    await app?.close();
  });

  const gql = async <T>(
    query: string,
    variables?: object,
    token?: string,
  ): Promise<GqlResponse<T>> => {
    const res = await request(app.getHttpServer() as App)
      .post('/graphql')
      .set(token ? { Authorization: `Bearer ${token}` } : {})
      .send({ query, variables });
    return res.body as GqlResponse<T>;
  };

  it('rotates a refresh token and detects reuse', async () => {
    const email = `e2e-${randomUUID()}@test.com`;

    // 1. register
    const reg = await gql<{ register: Tokens }>(REGISTER, {
      input: { name: 'E2E', email, password: 'password123' },
    });
    expect(reg.errors).toBeUndefined();
    const first = reg.data!.register;
    expect(first.refreshToken).toBeTruthy();

    // 2. refresh with token 1 -> gets token 2
    const ok = await gql<{ refresh: Tokens }>(REFRESH, {
      input: { refreshToken: first.refreshToken },
    });
    expect(ok.errors).toBeUndefined();
    const second = ok.data!.refresh;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // 3. reuse token 1 -> must fail
    const reuse = await gql(REFRESH, {
      input: { refreshToken: first.refreshToken },
    });
    expect(reuse.errors).toBeDefined();

    // 4. the family is revoked, so token 2 must fail too
    const after = await gql(REFRESH, {
      input: { refreshToken: second.refreshToken },
    });
    expect(after.errors).toBeDefined();
  });
});
