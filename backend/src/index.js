import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { openDb } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { sessionRoutes } from "./routes/sessions.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { adminRoutes } from "./routes/admin.js";
import { syncRoutes } from "./routes/sync.js";
import { requireUser, requireAdmin } from "./middleware/auth.js";
import { SyncAdapter } from "./sync/adapter.js";

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const db = await openDb();
const syncAdapter = new SyncAdapter();

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes(db));
app.use("/api/sessions", sessionRoutes(db));
app.use("/api/attendance", requireUser, attendanceRoutes(db));

app.use("/api/admin", adminRoutes(db));
app.use("/api/admin/sessions", requireAdmin, sessionRoutes(db));
app.use("/api/admin/attendance", requireAdmin, attendanceRoutes(db));

app.use("/api/sync", syncRoutes(syncAdapter));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

app.listen(PORT, () => {
  console.log(`Attendance server running on port ${PORT}`);
});
