# Dada Bhagwan Foundation UAE - Attendance System (Offline-first)

Offline-first, QR-based attendance system for weekly satsang sessions. Designed to work over local hall Wi-Fi, handle high concurrency, and sync to the cloud later.

## Project Structure
```
backend/   # Node.js + Express + SQLite local server
frontend/  # React + Vite PWA client
```

## Architecture (Textual)
```
[ PWA (React + Vite + Service Worker) ]
    | LAN HTTP
    v
[ Local Server (Node.js + Express) ]
    | SQLite (users, sessions, attendance)
    | QR token rotation (5 min window)
    | OTP mock (console)
    v
[ Sync Adapter Stub ] -> (future cloud database)
```

## Database Schema (SQLite)
- `users`: id, phone, name, age, gender, location
- `sessions`: id, date, start/end time
- `attendance`: id, user_id, session_id, marked_at, method
- `session_tokens`: stores generated tokens if you want to persist
- `admins`: basic admin login

## Backend API (summary)
Base URL: `http://localhost:4000/api`

### Auth
- `POST /auth/request-otp` → `{ phone }` → logs OTP to server console
- `POST /auth/verify-otp` → `{ phone, code }` → `{ token, user }`

### Sessions
- `GET /sessions`
- `POST /sessions`
- `PUT /sessions/:id`
- `GET /sessions/:id/qr` → returns QR payload + data URL

### Attendance
- `POST /attendance/mark` (user token required)
- `POST /admin/attendance/manual` (admin token required)
- `GET /admin/attendance/session/:id`

### Admin
- `POST /admin/login`
- `GET /admin/attendance/export?sessionId=...` (CSV)
- `GET /admin/stats/summary`

### Sync (stub)
- `GET /sync/status`
- `POST /sync/push`
- `GET /sync/pull-sessions`

## Setup
### Backend
```bash
cd backend
npm install
npm run dev
```

Environment variables (optional):
```
PORT=4000
DB_PATH=./data.db
QR_SECRET=local-dev-secret
QR_WINDOW_MINUTES=5
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Update `VITE_API_BASE` in `frontend/.env` if your server runs on another host/port:
```
VITE_API_BASE=http://localhost:4000/api
```

## Notes
- OTP is mocked (printed to console) for offline testing.
- QR tokens rotate every 5 minutes.
- Attendance marking is idempotent via `(user_id, session_id)` unique constraint.
- PWA assets are cached for offline use; background sync is stubbed.

## Next Steps
- Implement real SMS provider for OTP
- Cloud sync implementation
- Local network discovery of server
- Multilingual UI (Hindi/Gujarati)
