import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { validateToken } from "../utils/qr.js";

export function attendanceRoutes(db) {
  const router = Router();

  router.post("/mark", async (req, res) => {
    const { sessionId, token, deviceId } = req.body || {};
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!sessionId || !token) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const session = await db.get("SELECT * FROM sessions WHERE id = ?", sessionId);
    if (!session) {
      return res.status(404).json({ error: "session_not_found" });
    }

    if (!validateToken(sessionId, token)) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const existing = await db.get(
      "SELECT * FROM attendance WHERE user_id = ? AND session_id = ?",
      user.id,
      sessionId
    );

    if (existing) {
      return res.json({ status: "already_marked", attendanceId: existing.id });
    }

    const attendanceId = uuidv4();
    await db.run(
      `INSERT INTO attendance (id, user_id, session_id, marked_at, method, device_id)
       VALUES (?, ?, ?, ?, ?, ?)`
      , attendanceId,
      user.id,
      sessionId,
      nowIso(),
      "qr",
      deviceId || null
    );

    return res.json({ status: "marked", attendanceId });
  });

  router.post("/manual", async (req, res) => {
    const { sessionId, userId } = req.body || {};
    if (!sessionId || !userId) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const existing = await db.get(
      "SELECT * FROM attendance WHERE user_id = ? AND session_id = ?",
      userId,
      sessionId
    );

    if (existing) {
      return res.json({ status: "already_marked", attendanceId: existing.id });
    }

    const attendanceId = uuidv4();
    await db.run(
      `INSERT INTO attendance (id, user_id, session_id, marked_at, method, device_id)
       VALUES (?, ?, ?, ?, ?, ?)`
      , attendanceId,
      userId,
      sessionId,
      nowIso(),
      "manual",
      null
    );

    return res.json({ status: "marked", attendanceId });
  });

  router.get("/session/:id", async (req, res) => {
    const records = await db.all(
      `SELECT attendance.*, users.phone, users.email, users.name, users.mahatma_id
       FROM attendance
       JOIN users ON users.id = attendance.user_id
       WHERE attendance.session_id = ?
       ORDER BY attendance.marked_at DESC`,
      req.params.id
    );
    return res.json({ attendance: records });
  });

  return router;
}
