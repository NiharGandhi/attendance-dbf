const userSessions = new Map();
const adminSessions = new Map();

export function storeUserSession(token, user) {
  userSessions.set(token, { user, createdAt: Date.now() });
}

export function storeAdminSession(token, admin) {
  adminSessions.set(token, { admin, createdAt: Date.now() });
}

export function requireUser(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token || !userSessions.has(token)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = userSessions.get(token).user;
  return next();
}

export function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: "admin_unauthorized" });
  }
  req.admin = adminSessions.get(token).admin;
  return next();
}

export function attachSession(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  if (token && userSessions.has(token)) {
    req.user = userSessions.get(token).user;
  }
  if (token && adminSessions.has(token)) {
    req.admin = adminSessions.get(token).admin;
  }
  return next();
}
