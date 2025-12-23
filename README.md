# Dada Bhagwan Foundation UAE - Attendance System

Online QR-based attendance system for weekly satsang sessions. Designed for quick adoption with a local server and PWA client, with room to add offline and cloud sync later.

## Project Structure
```
backend/   # Node.js + Express + SQLite local server
frontend/  # React + Vite PWA client
```

## Architecture (Textual)
```
[ PWA (React + Vite) ]
    | LAN/Internet HTTP
    v
[ Local Server (Node.js + Express) ]
    | SQLite (users, sessions, attendance)
    | QR token rotation (5 min window)
    v
[ Sync Adapter Stub ] -> (future cloud database)
```

## Database Schema (SQLite)
- `users`: id, email, password_hash, name, mahatma_id (optional), age, gender, location
- `sessions`: id, date, start/end time
- `attendance`: id, user_id, session_id, marked_at, method
- `session_tokens`: stores generated tokens if you want to persist
- `admins`: basic admin login

## Backend API (summary)
Base URL: `http://localhost:4000/api`

### Auth
- `POST /auth/signup` → `{ name, email, password, mahatmaId? }` → `{ token, user }`
- `POST /auth/login` → `{ email, password }` → `{ token, user }`

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
- Mahatma ID is optional; users can sign up with name/email/password alone.
- Attendance marking is idempotent via `(user_id, session_id)` unique constraint.
- QR tokens rotate every 5 minutes.

## Next Steps
- Cloud sync implementation
- Local network discovery of server
- Multilingual UI (Hindi/Gujarati)
