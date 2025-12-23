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
  const legacyUser = !names.has("email") || !names.has("password_hash") || !names.has("mahatma_id");
  if (!legacyUser) {
    return;
  }

  if (!names.has("email")) {
    await db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  }
  if (!names.has("password_hash")) {
    await db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  }
  if (!names.has("mahatma_id")) {
    await db.exec(`ALTER TABLE users ADD COLUMN mahatma_id TEXT`);
  }

  const existingUsers = await db.all(`SELECT id, email, password_hash, mahatma_id FROM users`);
  const usedEmails = new Set();
  const usedMahatma = new Set();

  for (const user of existingUsers) {
    let email = user.email;
    let passwordHash = user.password_hash;
    let mahatmaId = user.mahatma_id;

    if (!email) {
      email = `legacy-${user.id}@example.invalid`;
    }
    while (usedEmails.has(email)) {
      email = `legacy-${cryptoRandomId()}@example.invalid`;
    }
    usedEmails.add(email);

    if (mahatmaId) {
      if (usedMahatma.has(mahatmaId)) {
        mahatmaId = null;
      } else {
        usedMahatma.add(mahatmaId);
      }
    }

    if (!passwordHash) {
      passwordHash = "legacy";
    }

    await db.run(
      `UPDATE users SET email = ?, password_hash = ?, mahatma_id = ? WHERE id = ?`,
      email,
      passwordHash,
      mahatmaId,
      user.id
    );
  }

  await db.exec(`
    CREATE TABLE users_new (
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
  `);

  await db.exec(`
    INSERT INTO users_new (id, phone, email, password_hash, mahatma_id, name, age, gender, location, created_at)
    SELECT id, phone, email, password_hash, mahatma_id, name, age, gender, location, created_at
    FROM users;
  `);

  await db.exec(`DROP TABLE users`);
  await db.exec(`ALTER TABLE users_new RENAME TO users`);
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)`);
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_mahatma_unique ON users(mahatma_id)`);
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}
