import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DATABASE_CONNECTION, DATABASE_URL } from './db-connection';
import { drizzle } from 'drizzle-orm/node-postgres/driver';

export const databsaeProvider: Provider = {
  provide: DATABASE_CONNECTION,
  useFactory: (configService: ConfigService) => {
    const pool = new Pool({
      connectionString: configService.getOrThrow<string>(DATABASE_URL),
    });
    return drizzle({ client: pool });
  },
  inject: [ConfigService],
};
