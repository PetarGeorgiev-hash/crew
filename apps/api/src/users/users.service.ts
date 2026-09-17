import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class UsersService {
  users: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
  }[] = [
    {
      id: '1',
      userName: 'test',
      firstName: 'test1',
      lastName: 'test2',
    },
  ];
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase,
  ) {}

  findOneById(id: string) {
    console.log(id);
    return this.users.filter((user) => id == user.id);
  }

  // todo: add db and user schema !!

  findAll() {
    return this.users;
  }

  craeteUser(id: string) {
    this.users.push({
      id,
      firstName: '',
      lastName: '',
      userName: '',
    });
  }
}
