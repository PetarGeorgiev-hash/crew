# Crew

Crew is a pnpm monorepo containing a NestJS GraphQL API and an Expo mobile app. PostgreSQL is used by the API.

## Requirements

- Node.js 24 (the repository pins this version in `.nvmrc`)
- pnpm 12.4.1
- Docker with the Docker Compose plugin, if using the containerized database or API

Enable Corepack if needed, then install dependencies from the repository root:

```sh
nvm use
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install --frozen-lockfile
```

`nvm use` reads the Node.js version from the root `.nvmrc`. If that version is not installed yet, run `nvm install` from the repository root, then run `nvm use`.

## Environment

The API loads `apps/api/.env` and validates its settings during startup. Create a local file from the example:

```sh
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` to your PostgreSQL connection string. Use a different value depending on where PostgreSQL is running:

- Local PostgreSQL: use the host, port, database, and credentials configured on your machine.
- PostgreSQL from this repository's Compose file: use host `localhost`, port `6432`, database `crewdb`, and the credentials in `docker-compose.yaml`.

Replace the example values for `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `EMAIL_CODE_SECRET` with unique random values. `EMAIL_CODE_SECRET` must be at least 32 characters. For example, run `openssl rand -hex 32` three times and use a different result for each secret.

`MAIL_DRIVER=console` is suitable for local development and logs verification codes instead of sending email. To use Resend, set `MAIL_DRIVER=resend`, configure `RESEND_API_KEY` and `MAIL_FROM`, and use a real sender address. Google OAuth settings are optional unless you are enabling Google sign-in.

Do not commit `apps/api/.env` or use the development credentials in `docker-compose.yaml` and `apps/api/.env.docker` in production.

## Local development

1. Configure `apps/api/.env` as described above.
2. Start PostgreSQL. You can use a local installation or start the Compose database:

   ```sh
   docker compose up -d crew-db
   ```

   When using this Compose database, set the host-side `DATABASE_URL` in `apps/api/.env` to port `6432`.
3. Apply the database migrations:

   ```sh
   pnpm db:migrate
   ```
4. Start the API:

   ```sh
   pnpm --filter @crew/api dev
   ```

5. In another terminal, start the Expo development server:

   ```sh
   pnpm dev:mobile
   ```

The GraphQL endpoint is available at `http://localhost:3000/graphql`. To start the API, mobile app, and Drizzle Studio together, run this from the repository root:

```sh
pnpm dev
```

This uses Turbo to run the `dev` tasks for the API and mobile app along with the API's `db:studio` task. The API is available at `http://localhost:3000/graphql`, Drizzle Studio at `http://localhost:3300`, and Expo prints its development-server URL in the terminal. This workflow does not start PostgreSQL; start or provide a database separately. To launch only Drizzle Studio, run `pnpm db:studio`.

## Docker

The Compose configuration starts PostgreSQL and the API. The API container receives its settings from `apps/api/.env.docker`; its database URL must use the Compose service hostname `crew-db` and the internal PostgreSQL port `5432`. Those database credentials must match the values configured for the `crew-db` service in `docker-compose.yaml`.

Database migrations are not run automatically by the API container. Run them from the host using the host-side `.env` connection string before starting the API:

```sh
docker compose up -d crew-db
# Set DATABASE_URL in apps/api/.env to the Compose database on localhost:6432.
pnpm db:migrate
docker compose up --build -d api
```

Check service status and logs:

```sh
docker compose ps
docker compose logs -f api
```

Stop the services without deleting the database volume:

```sh
docker compose down
```

To also delete the local database data, explicitly remove the volume with `docker compose down -v`.

## Database changes

After changing the API's Drizzle schema, generate a migration and apply it:

```sh
pnpm db:generate
pnpm db:migrate
```

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev:api` | Start the API and Drizzle Studio through Turbo |
| `pnpm --filter @crew/api dev` | Start only the API in watch mode |
| `pnpm dev:mobile` | Start Expo |
| `pnpm build` | Build workspace packages |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Start Drizzle Studio on port 3300 |
