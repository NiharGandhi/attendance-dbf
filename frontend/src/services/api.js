const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "unknown" }));
    throw new Error(error.error || "request_failed");
  }

  return response.json();
}

export const api = {
  signUp: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  listSessions: () => request("/sessions"),
  getSessionQr: (sessionId) => request(`/sessions/${sessionId}/qr`),
  markAttendance: (token, payload) =>
    request("/attendance/mark", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminLogin: (payload) => request("/admin/login", { method: "POST", body: JSON.stringify(payload) }),
  adminCreateSession: (token, payload) =>
    request("/admin/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminManualAttendance: (token, payload) =>
    request("/admin/attendance/manual", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminListAttendance: (token, sessionId) =>
    request(`/admin/attendance/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminStats: (token) =>
    request("/admin/stats/summary", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
