# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5.x - Frontend (all `.ts` / `.tsx` files in `frontend/`)
- Python 3.13 - Backend (all `.py` files in `backend/`)

**Secondary:**
- Shell script - Cron job loop: `backend/scripts/cron-loop.sh`

## Runtime

**Frontend:**
- Node.js 22 (Alpine) — specified in `frontend/Dockerfile` base image `node:22-alpine`

**Backend:**
- Python 3.13 (Slim) — specified in `backend/Dockerfile` base image `python:3.13-slim`
- ASGI server: Uvicorn 0.40.0 — `uvicorn src.main:app --host 0.0.0.0 --port 5050`

## Package Manager

**Frontend:**
- pnpm (via `corepack enable` in `frontend/Dockerfile`)
- Lockfile: `frontend/pnpm-lock.yaml` (committed)
- Workspace: `frontend/pnpm-workspace.yaml`

**Backend:**
- pip with pinned `requirements.txt`
- No lockfile beyond `requirements.txt` exact versions

## Frameworks

**Core Frontend:**
- Next.js 16.1.1 — App Router, SSR, standalone output mode
  - Config: `frontend/next.config.ts`
  - Output mode: `standalone` (used in Docker build)
  - API rewrites: `/api/:path*` → backend at `INTERNAL_API_URL`

**Core Backend:**
- FastAPI 0.128.0 — REST API framework
  - Entry point: `backend/src/main.py`
  - Starlette 0.50.0 (FastAPI dependency)
  - CORS middleware configured from `CORS_ORIGINS` env var

**UI / Component Library:**
- React 19.2.3 + React DOM 19.2.3
- shadcn/ui (component scaffolding) — configured in `frontend/components.json` (style: new-york, baseColor: neutral)
- Radix UI primitives: checkbox, dialog, dropdown-menu, label, popover, radio-group, select, separator, slot, switch, tabs (all ^1–2.x)
- Tailwind CSS 4.x — `frontend/postcss.config.mjs`, `frontend/app/globals.css`
- tailwind-merge 3.4.0, class-variance-authority 0.7.1, clsx 2.1.1 — utility class helpers
- tw-animate-css 1.4.0 — animation utilities

**Forms:**
- react-hook-form 7.69.0 + @hookform/resolvers 5.2.2
- Zod 4.2.1 — schema validation

**Data / Tables:**
- @tanstack/react-table 8.21.3 — headless table management
- recharts 3.6.0 — charting library

**Date Handling:**
- date-fns 4.1.0 — frontend date utilities
- react-day-picker 9.13.0 — calendar/date picker component
- python-dateutil 2.9.0 — backend date arithmetic (relativedelta)

**HTTP Client (Frontend):**
- axios 1.13.2

**Icons:**
- lucide-react 0.562.0

**Notifications:**
- sonner 2.0.7 — toast notifications

**OTP Input:**
- input-otp 1.4.2

**Theming:**
- next-themes 0.4.6

**Backend Auth / Security:**
- passlib 1.7.4 + bcrypt 4.0.1 — password hashing
- python-jose 3.5.0 — JWT encoding/decoding (HS256)
- cryptography 46.0.3

**Backend Settings:**
- pydantic-settings 2.12.0 — typed settings from env vars (`backend/src/core/config.py`)
- pydantic 2.12.5 with email validation
- python-dotenv 1.2.1

## Build Tools / Bundlers

**Frontend:**
- Next.js built-in (SWC compiler, Webpack/Turbopack internals)
- PostCSS 8.5.6 with `@tailwindcss/postcss` 4.x — `frontend/postcss.config.mjs`
- TypeScript compiler (type-checking only, `noEmit: true`)

**Backend:**
- No build step; Python source run directly by Uvicorn

**Linting / Formatting:**
- ESLint 9 with `eslint-config-next` 16.1.1 and `typescript-eslint` — `frontend/eslint.config.mjs`
- Prettier 3.7.4 + `eslint-config-prettier` 10.1.8 — `frontend/`

## Database & Migrations

**ORM:**
- SQLAlchemy 2.0.45 (async) with `asyncpg` 0.31.0 driver
- Session factory: `backend/src/db/session.py` — `create_async_engine` + `async_sessionmaker`

**Migrations:**
- Alembic 1.17.2
- Config: `backend/alembic.ini`
- Versions directory: `backend/alembic/versions/`
- Three migrations: initial schema, users table modification, caching indexes

**Caching:**
- redis-py 5.0.7 (async interface via `redis.asyncio`)
- Cache utility: `backend/src/utils/cache.py`

## Testing

**Backend:**
- pytest 8.3.3
- pytest-asyncio 0.23.8
- httpx 0.27.2 — async HTTP client for test requests
- Test directory: `backend/tests/`

**Frontend:**
- No test framework detected in `frontend/package.json`

## Containerisation & Infrastructure

**Container Runtime:**
- Docker — multi-stage builds for both services
- Docker Compose: `docker-compose.yml` defines 7 services: nginx, certbot, frontend, backend, db, redis, cron

**Services:**
- `mms-nginx` — nginx:1.27-alpine, reverse proxy (ports 80/443)
- `mms-frontend` — Next.js, port 3000 (internal)
- `mms-backend` — FastAPI/Uvicorn, port 5050 (internal)
- `mms-postgres` — postgres:16-alpine, port 5435 (external mapping)
- `mms-redis` — redis:7-alpine, port 6379
- `mms-certbot` — certbot/certbot:latest, Let's Encrypt TLS
- `mms-cron` — curlimages/curl:8.10.1, runs `backend/scripts/cron-loop.sh` every 120 min

**Network:**
- External Docker network: `shared-proxy` (`mms-network`)

## Configuration

**Environment loading:**
- Backend: pydantic-settings reads `.env` file (`backend/src/core/config.py`)
- Frontend: Next.js reads `.env.local` and build args (`NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`)
- Examples: `backend/.env.example`, `frontend/.env.example`

**TypeScript paths:**
- `@/*` → `frontend/` root — configured in `frontend/tsconfig.json`

**shadcn aliases:**
- `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`

---

*Stack analysis: 2026-04-01*
