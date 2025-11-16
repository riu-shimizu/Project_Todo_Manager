import db from '../db';
import { DEMO_USER_ID } from '../../domain/constants';

export const userRepository = {
  ensureDemoUser() {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, name, email, createdAt)
       VALUES (?, ?, ?, ?)`
    ).run(DEMO_USER_ID, 'Demo User', 'demo@example.com', new Date().toISOString());
  },
};
