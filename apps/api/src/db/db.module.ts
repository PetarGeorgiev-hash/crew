import { Global, Module } from '@nestjs/common';
import { databsaeProvider } from './db.provider';
import { DATABASE_CONNECTION } from './db-connection';

@Global()
@Module({
  providers: [databsaeProvider],
  exports: [DATABASE_CONNECTION],
})
export class DbModule {}
