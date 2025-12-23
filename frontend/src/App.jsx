import { useEffect, useMemo, useState } from "react";
import QRCodeScanner from "./components/QRCodeScanner.jsx";
import { api } from "./services/api.js";

const defaultUserState = { phone: "", otp: "", requestId: "" };

export default function App() {
  const [userToken, setUserToken] = useState(() => localStorage.getItem("userToken") || "");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [userForm, setUserForm] = useState(defaultUserState);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [status, setStatus] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendanceList, setAttendanceList] = useState([]);
  const [stats, setStats] = useState(null);
  const [manualEntry, setManualEntry] = useState({ sessionId: "", userId: "" });
  const [online, setOnline] = useState(navigator.onLine);

  const activeView = useMemo(() => {
    if (adminToken) return "admin";
    if (userToken) return "scan";
    return "login";
  }, [adminToken, userToken]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    api.listSessions().then(({ sessions }) => setSessions(sessions)).catch(() => null);
  }, []);

  async function requestOtp() {
    setStatus("");
    const { requestId } = await api.requestOtp(userForm.phone);
    setUserForm((prev) => ({ ...prev, requestId }));
    setStatus("OTP sent. Please check the console on the server.");
  }

  async function verifyOtp() {
    setStatus("");
    const { token } = await api.verifyOtp({ phone: userForm.phone, code: userForm.otp });
    localStorage.setItem("userToken", token);
    setUserToken(token);
    setStatus("Login successful.");
  }

  function handleScanPayload(payload) {
    try {
      const data = JSON.parse(payload);
      if (!data.sessionId || !data.token) {
        setStatus("Invalid QR payload.");
        return;
      }
      markAttendance(data);
    } catch (error) {
      setStatus("Could not parse QR payload.");
    }
  }

  async function markAttendance(data) {
    setStatus("Marking attendance...");
    try {
      const response = await api.markAttendance(userToken, {
        sessionId: data.sessionId,
        token: data.token,
        deviceId: navigator.userAgent,
      });
      if (response.status === "already_marked") {
        setStatus("Attendance already marked for this session.");
      } else {
        setStatus("Attendance marked successfully.");
      }
    } catch (error) {
      setStatus(`Failed to mark attendance: ${error.message}`);
    }
  }

  async function loginAdmin() {
    setStatus("");
    const { token } = await api.adminLogin(adminForm);
    localStorage.setItem("adminToken", token);
    setAdminToken(token);
  }

  async function createSession(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const payload = {
      date: data.get("date"),
      startTime: data.get("startTime"),
      endTime: data.get("endTime"),
    };
    const { session } = await api.adminCreateSession(adminToken, payload);
    setSessions((prev) => [session, ...prev]);
    event.target.reset();
  }

  async function loadAttendance(sessionId) {
    setSelectedSession(sessionId);
    const { attendance } = await api.adminListAttendance(adminToken, sessionId);
    setAttendanceList(attendance);
  }

  async function loadStats() {
    const summary = await api.adminStats(adminToken);
    setStats(summary);
  }

  async function submitManual() {
    await api.adminManualAttendance(adminToken, manualEntry);
    setStatus("Manual attendance saved.");
    if (manualEntry.sessionId) {
      loadAttendance(manualEntry.sessionId);
    }
  }

  function logout() {
    setUserToken("");
    localStorage.removeItem("userToken");
  }

  function adminLogout() {
    setAdminToken("");
    localStorage.removeItem("adminToken");
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>DBF Attendance</h1>
          <p className="muted">Offline-first attendance for weekly satsang.</p>
        </div>
        <span className={`badge ${online ? "online" : "offline"}`}>{online ? "Online" : "Offline"}</span>
      </header>

      {status && <div className="status">{status}</div>}

      {activeView === "login" && (
        <section className="card">
          <h2>User Login</h2>
          <label>
            Phone number
            <input
              value={userForm.phone}
              onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })}
              placeholder="e.g. +9715xxxxxxx"
            />
          </label>
          <button onClick={requestOtp} className="primary">Send OTP</button>
          <label>
            OTP code
            <input
              value={userForm.otp}
              onChange={(event) => setUserForm({ ...userForm, otp: event.target.value })}
              placeholder="Enter 6-digit code"
            />
          </label>
          <button onClick={verifyOtp} className="secondary">Verify & Login</button>

          <div className="divider" />

          <h2>Admin Login</h2>
          <label>
            Username
            <input
              value={adminForm.username}
              onChange={(event) => setAdminForm({ ...adminForm, username: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={adminForm.password}
              onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
            />
          </label>
          <button onClick={loginAdmin}>Login as Admin</button>
        </section>
      )}

      {activeView === "scan" && (
        <section className="card">
          <div className="card-header">
            <h2>Scan Session QR</h2>
            <button onClick={logout} className="link">Logout</button>
          </div>
          <QRCodeScanner onScan={handleScanPayload} />
          <label>
            Paste QR payload (fallback)
            <textarea
              rows="3"
              onBlur={(event) => handleScanPayload(event.target.value)}
              placeholder='{"sessionId":"...","token":"..."}'
            />
          </label>
        </section>
      )}

      {activeView === "admin" && (
        <section className="grid">
          <div className="card">
            <div className="card-header">
              <h2>Admin Dashboard</h2>
              <button onClick={adminLogout} className="link">Logout</button>
            </div>
            <button onClick={loadStats}>Refresh stats</button>
            {stats && (
              <ul className="stats">
                <li>Sessions: {stats.sessions}</li>
                <li>Attendance: {stats.attendance}</li>
                <li>Unique users: {stats.uniqueUsers}</li>
              </ul>
            )}
          </div>

          <div className="card">
            <h3>Create Session</h3>
            <form onSubmit={createSession} className="stack">
              <input name="date" type="date" required />
              <input name="startTime" type="time" required />
              <input name="endTime" type="time" required />
              <button type="submit" className="primary">Create</button>
            </form>
          </div>

          <div className="card">
            <h3>Manual Attendance</h3>
            <label>
              Session ID
              <input
                value={manualEntry.sessionId}
                onChange={(event) => setManualEntry({ ...manualEntry, sessionId: event.target.value })}
              />
            </label>
            <label>
              User ID
              <input
                value={manualEntry.userId}
                onChange={(event) => setManualEntry({ ...manualEntry, userId: event.target.value })}
              />
            </label>
            <button onClick={submitManual}>Save</button>
          </div>

          <div className="card">
            <h3>Sessions</h3>
            <ul className="list">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button onClick={() => loadAttendance(session.id)} className="link">
                    {session.date} {session.start_time} - {session.end_time}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>Attendance</h3>
            {selectedSession && (
              <p className="muted">Session: {selectedSession}</p>
            )}
            <ul className="list">
              {attendanceList.map((record) => (
                <li key={record.id}>
                  {record.marked_at} - {record.phone} {record.name ? `(${record.name})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
