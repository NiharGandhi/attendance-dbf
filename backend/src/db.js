import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_PATH = process.env.DB_PATH || "./data.db";

export async function openDb() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      mahatma_id TEXT UNIQUE,
      name TEXT,
      age INTEGER,
      gender TEXT,
      location TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      marked_at TEXT NOT NULL,
      method TEXT NOT NULL,
      device_id TEXT,
      UNIQUE(user_id, session_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS session_tokens (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      token TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await ensureUserColumns(db);

  return db;
}

async function ensureUserColumns(db) {
  const columns = await db.all(`PRAGMA table_info(users)`);
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("email")) {
    await db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)`);
  }
  if (!names.has("password_hash")) {
    await db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  }
  if (!names.has("mahatma_id")) {
    await db.exec(`ALTER TABLE users ADD COLUMN mahatma_id TEXT`);
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_mahatma_unique ON users(mahatma_id)`);
  }
}
