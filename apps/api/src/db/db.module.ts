import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION } from './db-connection';
import { databsaeProvider } from './db.provider';

@Module({
  providers: [databsaeProvider],
  exports: [DATABASE_CONNECTION],
})
export class DbModule {}
