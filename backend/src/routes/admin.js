import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { storeAdminSession, requireAdmin } from "../middleware/auth.js";

const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USER || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function adminRoutes(db) {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const stored = await db.get("SELECT * FROM admins WHERE username = ?", username);
    if (!stored) {
      const id = uuidv4();
      await db.run(
        "INSERT INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        id,
        DEFAULT_ADMIN.username,
        hashPassword(DEFAULT_ADMIN.password),
        nowIso()
      );
    }

    const admin = await db.get("SELECT * FROM admins WHERE username = ?", username);
    if (!admin || admin.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = uuidv4();
    storeAdminSession(token, admin);
    return res.json({ token, admin: { id: admin.id, username: admin.username } });
  });

  router.use(requireAdmin);

  router.get("/attendance/export", async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId_required" });
    }

    const records = await db.all(
      `SELECT attendance.marked_at, attendance.method, users.phone, users.name
       FROM attendance
       JOIN users ON users.id = attendance.user_id
       WHERE attendance.session_id = ?
       ORDER BY attendance.marked_at ASC`,
      sessionId
    );

    const headers = ["marked_at", "method", "phone", "name"];
    const rows = [headers.join(",")];
    for (const record of records) {
      const values = headers.map((key) => {
        const value = record[key] ?? "";
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      rows.push(values.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance-${sessionId}.csv`);
    return res.send(rows.join("\n"));
  });

  router.get("/stats/summary", async (_req, res) => {
    const totalSessions = await db.get("SELECT COUNT(*) as count FROM sessions");
    const totalAttendance = await db.get("SELECT COUNT(*) as count FROM attendance");
    const uniqueUsers = await db.get("SELECT COUNT(DISTINCT user_id) as count FROM attendance");
    const lastSevenDays = await db.all(
      `SELECT date, COUNT(*) as count
       FROM sessions
       WHERE date >= date('now', '-7 day')
       GROUP BY date
       ORDER BY date DESC`
    );
    return res.json({
      sessions: totalSessions.count,
      attendance: totalAttendance.count,
      uniqueUsers: uniqueUsers.count,
      lastSevenDays,
    });
  });

  return router;
}
