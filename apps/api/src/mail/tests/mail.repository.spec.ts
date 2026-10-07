import {
  createTestUser,
  deleteTestUser,
  setupDb,
} from '../../utils/test.utils';
import { MailRepository } from '../mail.repository';

describe('Mail.Repository', () => {
  const { pool, db } = setupDb();
  const repo = new MailRepository(db);
  let userId: string;

  beforeAll(async () => {
    userId = await createTestUser(db);
  });

  afterAll(async () => {
    await deleteTestUser(db, userId);
    await pool.end();
  });

  describe('it should ');
});
