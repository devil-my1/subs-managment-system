# Backend — Subscriptions Manager

Python 3.13 + FastAPI + async SQLAlchemy + PostgreSQL + Alembic (async). Auth via local email/password with JWT. Reminders via Resend. Timezone: Asia/Tokyo (stored UTC).

## Quick start (Docker)
- The primary deployment stack for this repository is the root [docker-compose.yml](../docker-compose.yml).
- This folder also keeps a backend-only local stack in [backend/docker-compose.backend.yaml](docker-compose.backend.yaml).
- Copy/adjust `.env` (see [backend/.env.example](.env.example)).
- Bring up services: `./scripts/compose.sh up`
- Tail logs: `./scripts/compose.sh logs`
- Run migrations: `./scripts/compose.sh migrate`
- Run tests: `./.venv/Scripts/python -m pytest -q` (or `pytest -q` if venv active)

Helper script lives at [backend/scripts/compose.sh](scripts/compose.sh). It runs `docker compose -f docker-compose.backend.yaml ...` for backend-only development. `./scripts/compose.sh help` shows commands (up, build, rebuild, restart, down, ps, logs, migrate, revision <msg>).

## Endpoints
Base URL: `http://localhost:5050/api/v1`
- Auth: `/auth/register`, `/auth/login`
- Subscriptions CRUD: `/subscriptions` (+ `/renew`, `/payments`)
- Jobs: `/jobs/send-reminders` (requires `X-Internal-Token`)
- Analytics: `/analytics/spend`, `/analytics/spend/by-month`, `/analytics/spend/by-category`

## Development notes
- CORS is open by default in [backend/src/main.py](src/main.py#L1-L20); restrict `allow_origins` when the frontend host is known.
- Redis caching is used for user lookup, subscriptions list, and analytics; see [backend/src/utils/cache.py](src/utils/cache.py).
- Reminders are stored UTC but scheduled for 09:00 JST by default.
- Payments are the source of truth for analytics; amounts can differ from subscription defaults.
- Alembic config: [backend/alembic.ini](alembic.ini), environment: [backend/alembic/env.py](alembic/env.py).

## Common commands
- Rebuild + restart backend: `./scripts/compose.sh rebuild`
- Create migration: `./scripts/compose.sh revision "my change"`
- Apply migrations: `./scripts/compose.sh migrate`
- Stop stack: `./scripts/compose.sh down`
