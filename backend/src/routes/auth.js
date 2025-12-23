import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { storeUserSession } from "../middleware/auth.js";

const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function authRoutes(db) {
  const router = Router();

  router.post("/request-otp", async (req, res) => {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: "phone_required" });
    }
    const code = generateOtp();
    const requestId = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phone, { code, expiresAt, requestId });

    console.log(`[otp] phone=${phone} code=${code}`);

    return res.json({ requestId, expiresIn: 300 });
  });

  router.post("/verify-otp", async (req, res) => {
    const { phone, code } = req.body || {};
    const record = otpStore.get(phone);
    if (!record || record.code !== code || record.expiresAt < Date.now()) {
      return res.status(401).json({ error: "invalid_otp" });
    }

    let user = await db.get("SELECT * FROM users WHERE phone = ?", phone);
    if (!user) {
      const id = uuidv4();
      const createdAt = nowIso();
      await db.run(
        `INSERT INTO users (id, phone, created_at) VALUES (?, ?, ?)`
        , id,
        phone,
        createdAt
      );
      user = await db.get("SELECT * FROM users WHERE id = ?", id);
    }

    const token = uuidv4();
    storeUserSession(token, user);
    return res.json({ token, user });
  });

  return router;
}
