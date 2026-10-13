# API

The API is a NestJS application that exposes a GraphQL endpoint and uses PostgreSQL through Drizzle ORM. For repository-wide installation, environment setup, local development, and Docker instructions, see the [root README](../../README.md).

## Source layout

```text
src/
  app.module.ts          Root Nest module; wires feature modules and GraphQL
  main.ts                Application bootstrap and global validation pipe
  auth/                  Authentication, authorization, and token handling
  config/                Environment schema and configuration validation
  db/                    PostgreSQL connection and Drizzle configuration
  mail/                  Verification mail providers and email-code logic
  users/                 User GraphQL operations and user persistence
  utils/                 Shared utility functions and test helpers
test/                    End-to-end tests
drizzle/                 Generated SQL migrations and Drizzle snapshots
```

Features are organized as Nest modules. Within a feature, the common files are:

- `*.module.ts`: registers the feature's providers and imports.
- `*.resolver.ts`: defines GraphQL queries and mutations.
- `*.service.ts`: implements application and business logic.
- `*.repository.ts`: performs persistence operations where the feature uses a repository.
- `models/`: GraphQL input and output classes used by resolvers. These are API types, not database table definitions.
- `schema/`: Drizzle table definitions that describe PostgreSQL tables and relations.
- `tests/`: feature-level unit tests, commonly for services, repositories, or utilities.

For example, `auth/resolver` handles GraphQL authentication operations, `auth/service` coordinates authentication behavior, `auth/schema` defines authentication-related tables, and `auth/tests` tests that feature's logic and persistence.

## GraphQL and authentication

The GraphQL endpoint is available at `http://localhost:3000/graphql` in local development. Resolvers declare the API operations; protected operations use the access-token guard and receive the authenticated user through the `@CurrentUser()` decorator. Operations explicitly marked `@Public()` do not require an access token.

The root module loads and validates environment variables against `src/config/env.schema.ts`. Configure `apps/api/.env` before starting the API; see the root README for the required values.

## Database

Drizzle table definitions live in each feature's `schema/` directory. Generated migrations and snapshots are stored in `drizzle/`.

Run these commands from the repository root:

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Generate a migration after changing a schema, review the generated SQL, and apply it to the configured database with `pnpm db:migrate`.

## Tests

Unit tests use Vitest and are located alongside feature code under `src/**/tests/`. Run them from the repository root:

```sh
pnpm --filter @crew/api test
pnpm --filter @crew/api test:watch
pnpm --filter @crew/api test:cov
```

End-to-end tests are under `test/` and use a running, migrated database and the API test environment. The configured runner is:

```sh
pnpm --filter @crew/api test:e2e
```

The current e2e configuration selects files named `*.e2e-spec.ts`; the checked-in test is named `auth.e2e-test.ts`. Rename the test or adjust `vitest.config.e2e.ts` so the runner includes it.

## Other API commands

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `pnpm --filter @crew/api dev` | Start the API in watch mode |
| `pnpm --filter @crew/api build` | Build the API |
| `pnpm --filter @crew/api check-types` | Type-check the API |
| `pnpm --filter @crew/api lint` | Lint API TypeScript files |
