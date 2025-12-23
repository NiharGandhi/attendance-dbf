import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "../utils/time.js";
import { storeAdminSession, requireAdmin } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const isProduction = process.env.NODE_ENV === "production";
const envAdminUser = process.env.ADMIN_USER || "";
const envAdminPassword = process.env.ADMIN_PASSWORD || "";
const generatedAdminPassword = !envAdminPassword && !isProduction ? `${uuidv4()}${uuidv4()}` : "";
if (generatedAdminPassword) {
  console.warn(
    "Generated one-time admin password for local use. Store it securely:",
    generatedAdminPassword
  );
}

function isWeakPassword(password) {
  if (!password || password.length < 12) return true;
  const lower = password.toLowerCase();
  const common = ["password", "admin", "admin123", "123456", "qwerty"];
  return common.some((word) => lower.includes(word));
}

function ensureAdminConfig() {
  if (isProduction && (!envAdminUser || !envAdminPassword)) {
    throw new Error("ADMIN_USER and ADMIN_PASSWORD are required in production");
  }
}

function getBootstrapPassword() {
  if (envAdminPassword) {
    if (isWeakPassword(envAdminPassword)) {
      throw new Error("ADMIN_PASSWORD is too weak");
    }
    return envAdminPassword;
  }
  return generatedAdminPassword;
}

export function adminRoutes(db) {
  const router = Router();

  router.post("/login", async (req, res) => {
    ensureAdminConfig();
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const stored = await db.get("SELECT * FROM admins WHERE username = ?", username);
    if (!stored) {
      const id = uuidv4();
      const configuredPassword = getBootstrapPassword();
      if (envAdminUser && username !== envAdminUser) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      if (configuredPassword && password !== configuredPassword) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      if (configuredPassword && isWeakPassword(configuredPassword)) {
        return res.status(400).json({ error: "weak_password" });
      }
      await db.run(
        "INSERT INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        id,
        username,
        hashPassword(password),
        nowIso()
      );
    }

    const admin = await db.get("SELECT * FROM admins WHERE username = ?", username);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
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
      `SELECT attendance.marked_at, attendance.method, users.phone, users.email, users.name, users.mahatma_id
       FROM attendance
       JOIN users ON users.id = attendance.user_id
       WHERE attendance.session_id = ?
       ORDER BY attendance.marked_at ASC`,
      sessionId
    );

    const headers = ["marked_at", "method", "phone", "email", "name", "mahatma_id"];
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

  router.get("/users", async (_req, res) => {
    const users = await db.all(
      `SELECT users.id, users.name, users.email, users.mahatma_id,
              COUNT(attendance.id) as attendance_count
       FROM users
       LEFT JOIN attendance ON attendance.user_id = users.id
       GROUP BY users.id
       ORDER BY users.created_at DESC`
    );
    return res.json({ users });
  });

  router.get("/users/:id/attendance", async (req, res) => {
    const records = await db.all(
      `SELECT sessions.date, sessions.start_time, sessions.end_time, attendance.marked_at
       FROM attendance
       JOIN sessions ON sessions.id = attendance.session_id
       WHERE attendance.user_id = ?
       ORDER BY sessions.date DESC, sessions.start_time DESC`,
      req.params.id
    );
    return res.json({ attendance: records });
  });

  return router;
}
