import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { generateToken, generateQrDataUrl } from "../utils/qr.js";

export function sessionRoutes(db) {
  const router = Router();

  router.get("/", async (_req, res) => {
    const sessions = await db.all("SELECT * FROM sessions ORDER BY date DESC, start_time DESC");
    return res.json({ sessions });
  });

  router.post("/", async (req, res) => {
    const { date, startTime, endTime } = req.body || {};
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const id = uuidv4();
    const now = nowIso();
    await db.run(
      `INSERT INTO sessions (id, date, start_time, end_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
      , id,
      date,
      startTime,
      endTime,
      now,
      now
    );
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", id);
    return res.status(201).json({ session });
  });

  router.get("/:id", async (req, res) => {
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", req.params.id);
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json({ session });
  });

  router.put("/:id", async (req, res) => {
    const { date, startTime, endTime } = req.body || {};
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", req.params.id);
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }

    const updated = {
      date: date ?? session.date,
      start_time: startTime ?? session.start_time,
      end_time: endTime ?? session.end_time,
      updated_at: nowIso(),
    };

    await db.run(
      `UPDATE sessions SET date = ?, start_time = ?, end_time = ?, updated_at = ? WHERE id = ?`,
      updated.date,
      updated.start_time,
      updated.end_time,
      updated.updated_at,
      req.params.id
    );

    const updatedSession = await db.get("SELECT * FROM sessions WHERE id = ?", req.params.id);
    return res.json({ session: updatedSession });
  });

  router.post("/:id/token", async (req, res) => {
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", req.params.id);
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }
    const { token, validFrom, validTo } = generateToken(session.id);
    return res.json({ token, validFrom, validTo });
  });

  router.get("/:id/qr", async (req, res) => {
    const session = await db.get("SELECT * FROM sessions WHERE id = ?", req.params.id);
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }
    const { token, validFrom, validTo } = generateToken(session.id);
    const payload = JSON.stringify({ sessionId: session.id, token });
    const qrDataUrl = await generateQrDataUrl(payload);
    return res.json({ token, validFrom, validTo, qrDataUrl, payload });
  });

  return router;
}
