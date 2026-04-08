# MockSewa v2.0 — Antigravity Architecture 🚀

> **Nepal's professional-grade exam preparation platform** — FastAPI + React TypeScript + PostgreSQL + Docker

---

## ⚡ Quick Start (One Command)

```bash
# 1. Clone & enter
cd mocksewa

# 2. Copy environment files
cp frontend/.env.example frontend/.env.local

# 3. Launch everything
docker-compose up --build
```

| Service | URL |
|---|---|
| **Frontend** (React) | http://localhost |
| **Backend API** (FastAPI) | http://localhost:8000 |
| **API Docs** (Swagger) | http://localhost:8000/docs |
| **Database** (PostgreSQL) | localhost:5432 |

---

## 🏗️ Architecture

```
mocksewa/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App entrypoint + all routers
│   │   ├── models.py           # SQLModel DB tables
│   │   ├── auth.py             # JWT access + refresh tokens
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── database.py         # Engine + session
│   │   └── api/
│   │       ├── admin.py        # 🔐 Admin CRUD + CSV import
│   │       ├── auth.py         # Register / Login / Refresh / Logout
│   │       ├── quiz.py         # Quiz engine + scoring
│   │       ├── student.py      # Dashboard + analytics
│   │       ├── video.py        # HLS progress tracking
│   │       └── leaderboard.py  # WebSocket real-time rankings
│   ├── backup.sh               # Automated daily DB backup
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Router + providers
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Design system (glass, brand colors)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # JWT state management
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios client + auto-refresh
│   │   │   └── queryClient.ts  # TanStack Query config
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   └── pages/
│   │       ├── LoginPage.tsx       # Auth UI
│   │       ├── Dashboard.tsx       # Student hub + radar chart
│   │       ├── QuizEngine.tsx      # Distraction-free quiz UI
│   │       ├── VideoPlayer.tsx     # HLS player + progress
│   │       ├── Leaderboard.tsx     # WebSocket live rankings
│   │       └── AdminPanel.tsx      # Content management + CSV
│   ├── nginx.conf              # Production reverse proxy
│   └── Dockerfile              # Multi-stage build
│
└── docker-compose.yml          # Full stack orchestration
```

---

## 🧠 Data Model

```
Course → Subject → Module → Question
                 └── VideoProgress (per user)
                 └── QuizSession → QuizAttempt
                                └── Analytics (per subject)
```

### Quiz Scoring Formula
$$\text{Score} = (\text{Correct} \times \text{marks}) - (\text{Wrong} \times 0.2)$$

---

## 🔑 Key Features

| Feature | Implementation |
|---|---|
| **JWT Auth + Refresh** | `auth.py` — 30min access, 7-day rotating refresh |
| **Admin Panel** | Protected routes via `get_current_admin` dependency |
| **CSV Import** | `/admin/questions/upload/dry-run` + `/commit` |
| **Quiz Engine** | Session-based, shuffled, flag-for-review, 15-min timer |
| **Radar Chart** | Recharts `RadarChart` — subject-wise mastery display |
| **Live Leaderboard** | WebSocket `/leaderboard/ws` — broadcasts after each quiz |
| **Video Progress** | HLS.js player — auto-marks complete at 90% watch time |
| **Offline PWA** | `vite-plugin-pwa` + Workbox service worker |
| **DB Backup** | `backup.sh` — daily gzip of SQLite + PostgreSQL, 30-day retention |
| **Docker Stack** | `docker-compose up --build` — zero reconfiguration deploy |

---

## 🔐 First Admin Setup

```bash
# Register first user, then promote via DB:
# 1. Register via POST /auth/register
# 2. Connect to postgres:
docker exec -it mocksewa_db psql -U admin mocksewa
UPDATE user SET is_admin = true WHERE email = 'your@email.com';
```

---

## 📤 CSV Question Format

Download the template from `backend/questions_template.csv`:

```csv
question,option_a,option_b,option_c,option_d,correct_index,explanation,marks
What is Ohm's Law?,V=IR,V=I+R,V=I/R,V=I*R,0,"V equals I times R",1
```

**Validation rules:**
- `question`: minimum 10 characters
- `option_a–d`: all 4 must be non-empty
- `correct_index`: integer 0–3 (A=0, B=1, C=2, D=3)

---

## 🚀 Development (without Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🌐 Production Deployment (VPS)

```bash
# 1. SSH into your VPS
# 2. Clone the repo
# 3. Set environment variables
export DB_PASSWORD="your_strong_password"
export SECRET_KEY="your_32_char_secret_key_here!!"

# 4. One command deploy
docker-compose up -d --build

# 5. Setup backup cron (already in docker-compose)
# Backups run at 2AM daily → /app/backups/ volume
```

---

## 📊 API Reference

Full interactive docs: **http://localhost:8000/docs**

Key endpoints:
- `POST /auth/login` — get access + refresh tokens
- `POST /auth/refresh` — rotate refresh token
- `GET /student/dashboard` — personalized hub data
- `GET /student/radar` — subject mastery for radar chart
- `POST /quiz/start` — begin quiz session
- `POST /quiz/submit` — submit answers, get score
- `WS /leaderboard/ws` — real-time rankings feed
- `POST /admin/questions/upload/dry-run` — validate CSV
- `POST /admin/questions/upload/commit` — import questions

---

*Built with ❤️ for Nepal's engineering community — NEA, PSC, and Technical exam candidates.*
