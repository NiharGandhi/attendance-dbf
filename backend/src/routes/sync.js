import { Router } from "express";

export function syncRoutes(syncAdapter) {
  const router = Router();

  router.get("/status", async (_req, res) => {
    return res.json({ status: "stub", message: "Cloud sync not configured" });
  });

  router.post("/push", async (req, res, next) => {
    try {
      const { records = [] } = req.body || {};
      const result = await syncAdapter.pushAttendance(records);
      return res.json({ result });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/pull-sessions", async (_req, res, next) => {
    try {
      const sessions = await syncAdapter.pullSessions();
      return res.json({ sessions });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
