import { Router } from "express";

export function syncRoutes(syncAdapter) {
  const router = Router();

  router.get("/status", async (_req, res) => {
    return res.json({ status: "stub", message: "Cloud sync not configured" });
  });

  router.post("/push", async (req, res) => {
    const { records = [] } = req.body || {};
    const result = await syncAdapter.pushAttendance(records);
    return res.json({ result });
  });

  router.get("/pull-sessions", async (_req, res) => {
    const sessions = await syncAdapter.pullSessions();
    return res.json({ sessions });
  });

  return router;
}
