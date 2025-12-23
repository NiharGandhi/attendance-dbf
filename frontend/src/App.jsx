import { useEffect, useMemo, useState } from "react";
import QRCodeScanner from "./components/QRCodeScanner.jsx";
import { api } from "./services/api.js";

const defaultSignUp = { name: "", email: "", password: "", mahatmaId: "" };
const defaultLogin = { email: "", password: "" };

export default function App() {
  const [userToken, setUserToken] = useState(() => localStorage.getItem("userToken") || "");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [signUpForm, setSignUpForm] = useState(defaultSignUp);
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [status, setStatus] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendanceList, setAttendanceList] = useState([]);
  const [stats, setStats] = useState(null);
  const [manualEntry, setManualEntry] = useState({ sessionId: "", userId: "" });
  const [online, setOnline] = useState(navigator.onLine);
  const [authMode, setAuthMode] = useState("signup");

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

  async function handleSignUp() {
    setStatus("");
    try {
      const payload = {
        name: signUpForm.name,
        email: signUpForm.email,
        password: signUpForm.password,
        mahatmaId: signUpForm.mahatmaId || undefined,
      };
      const { token } = await api.signUp(payload);
      localStorage.setItem("userToken", token);
      setUserToken(token);
      setStatus("Signup successful.");
    } catch (error) {
      setStatus(`Signup failed: ${error.message}`);
    }
  }

  async function handleLogin() {
    setStatus("");
    try {
      const { token } = await api.login(loginForm);
      localStorage.setItem("userToken", token);
      setUserToken(token);
      setStatus("Login successful.");
    } catch (error) {
      setStatus(`Login failed: ${error.message}`);
    }
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
          <p className="muted">Online attendance for weekly satsang.</p>
        </div>
        <span className={`badge ${online ? "online" : "offline"}`}>{online ? "Online" : "Offline"}</span>
      </header>

      {status && <div className="status">{status}</div>}

      {activeView === "login" && (
        <section className="card">
          <div className="tab-row">
            <button
              onClick={() => setAuthMode("signup")}
              className={authMode === "signup" ? "tab active" : "tab"}
            >
              Sign Up
            </button>
            <button
              onClick={() => setAuthMode("login")}
              className={authMode === "login" ? "tab active" : "tab"}
            >
              Login
            </button>
          </div>

          {authMode === "signup" ? (
            <div className="stack">
              <label>
                Full name
                <input
                  value={signUpForm.name}
                  onChange={(event) => setSignUpForm({ ...signUpForm, name: event.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={signUpForm.email}
                  onChange={(event) => setSignUpForm({ ...signUpForm, email: event.target.value })}
                  placeholder="name@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={signUpForm.password}
                  onChange={(event) => setSignUpForm({ ...signUpForm, password: event.target.value })}
                />
              </label>
              <label>
                Mahatma ID (optional)
                <input
                  value={signUpForm.mahatmaId}
                  onChange={(event) => setSignUpForm({ ...signUpForm, mahatmaId: event.target.value })}
                  placeholder="If you have a Mahatma ID"
                />
              </label>
              <button onClick={handleSignUp} className="primary">Create Account</button>
            </div>
          ) : (
            <div className="stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                />
              </label>
              <button onClick={handleLogin} className="secondary">Login</button>
            </div>
          )}

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
                  {record.marked_at} - {record.phone || record.email}{" "}
                  {record.name ? `(${record.name})` : ""}
                  {record.mahatma_id ? ` - ${record.mahatma_id}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
