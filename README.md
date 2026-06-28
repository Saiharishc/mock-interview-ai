# Mock Interview AI

AI-powered mock interview platform. Practice realistic interviews for any target role with an AI interviewer that asks adaptive follow-ups, evaluates each answer on five dimensions, and produces a downloadable score report.

## Status

Phase 1 (Foundations) is complete: monorepo scaffold, FastAPI backend with Google OAuth + JWT, SQLModel + SQLite, and a Vite + React + TypeScript + Tailwind frontend with dark/light theme and protected routes.

Phases 2 – 8 are scaffolded with placeholder pages and will be implemented next:

2. Settings & API Keys (encrypted CRUD + LiteLLM provider ping)
3. Configure + Resume (landing/configure UI + resume parsing + session creation)
4. Interview core (WebSocket + orchestrator + evaluator + persistence; text-only first)
5. Voice layer (Web Speech TTS/STT + text fallback + voice picker)
6. Report + PDF (Recharts page + WeasyPrint server-side PDF)
7. Dashboard + History + Modes (saved sessions + analytics + Practice/Exam toggle)
8. Polish (adaptive follow-ups, pause/resume, dedup, cost caps, error boundaries)

## Layout

```
mock-interview-ai/
├── backend/   FastAPI + SQLModel + LiteLLM
└── frontend/  React + Vite + TS + Tailwind
```

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
Copy-Item .env.example .env
# Generate a Fernet key and paste into MASTER_KEY:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Generate a JWT secret and paste into JWT_SECRET:
python -c "import secrets; print(secrets.token_urlsafe(48))"
# Get a Google OAuth Client ID from https://console.cloud.google.com/apis/credentials
# Authorized JS origin: http://localhost:5173
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/health to verify.

## Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
# Paste the same VITE_GOOGLE_CLIENT_ID
npm run dev
```

Visit http://localhost:5173 — you should land on the login page.

## Architecture notes

* **Auth**: Google ID token (`@react-oauth/google`) → backend verifies via `google-auth` → issues JWT → all subsequent API calls send `Authorization: Bearer <jwt>`.
* **DB**: SQLite via SQLModel; `init_db()` runs `create_all()` on app startup. Alembic migrations are scaffolded under `backend/alembic/` and will be wired in Phase 2.
* **API keys**: stored Fernet-encrypted (key derived from `MASTER_KEY`); decrypted keys never leave the backend.
* **LLM**: LiteLLM unifies OpenAI / Anthropic / Gemini / Azure / Groq / Ollama behind a single `chat()` call.
* **Voice**: native browser Web Speech API (Chrome / Edge). Text fallback is always available.

See [the implementation plan](../.claude/plans/build-a-modern-ai-powered-cozy-snail.md) for the full design.
