import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '..', '..', 'var');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'app.db');
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db;
