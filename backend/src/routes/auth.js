import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { storeUserSession } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export function authRoutes(db) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { name, email, password, mahatmaId } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const existing = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (existing) {
      return res.status(409).json({ error: "email_in_use" });
    }

    if (mahatmaId) {
      const existingMahatma = await db.get("SELECT * FROM users WHERE mahatma_id = ?", mahatmaId);
      if (existingMahatma) {
        return res.status(409).json({ error: "mahatma_in_use" });
      }
    }

    const id = uuidv4();
    const createdAt = nowIso();
    const passwordHash = hashPassword(password);

    await db.run(
      `INSERT INTO users (id, email, password_hash, name, mahatma_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
      , id,
      email,
      passwordHash,
      name,
      mahatmaId || null,
      createdAt
    );

    const user = await db.get("SELECT * FROM users WHERE id = ?", id);
    const token = uuidv4();
    storeUserSession(token, user);
    return res.status(201).json({ token, user });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const user = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = uuidv4();
    storeUserSession(token, user);
    return res.json({ token, user });
  });

  return router;
}
