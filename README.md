<div align="center">

# 💳 Subscription Management System

**Track, manage, and analyze all your recurring subscriptions in one place.**

A full-stack web + mobile platform with smart analytics, multi-currency support, email reminders, and a beautiful dark UI.

---

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![React Native](https://img.shields.io/badge/Expo-React%20Native-000020?style=for-the-badge&logo=expo)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

</div>

---

## ✨ What can you do?

### 🔐 Authentication
- **Register & log in** with email + password
- **Forgot your password?** — request a reset code via email, verify it, and set a new password
- **Change password** from your account at any time
- Secure JWT-based session management

---

### 📊 Dashboard
Get a bird's-eye view of your subscription finances at a glance:

| Stat | Description |
|------|-------------|
| **Monthly Spend** | Total amount billed in the last 30 days |
| **Yearly Spend** | Approximate annual cost based on active subscriptions |
| **Active Subscriptions** | Count of currently active plans + how many are new this month |
| **Upcoming Renewals** | Next renewal coming up, with countdown in days |

- **Monthly Spend Bar Chart** — visualize your spending trend over the year
- **Spend by Category Breakdown** — color-coded distribution of your budget per category

---

### 📋 Subscriptions
Full control over every subscription you track:

- **Add / Edit / Delete** subscriptions with a rich form
- Fields include:
  - Title, description, and service URL
  - Start date, next renewal date
  - Billing period: **Monthly** or **Yearly**
  - Amount and currency *(any ISO 4217 currency code)*
  - Status: `active` · `paused` · `canceled` · `expired`
  - Auto-renew toggle
  - Category assignment
  - Reminder days before renewal
- **Search** subscriptions by name
- **Filter** by status and billing period
- **Sortable table** with instant inline editing

---

### 🗂️ Categories
Organize subscriptions your way:

- **Create custom categories** with names and colors
- **Assign any subscription** to a category
- Categories appear in analytics and dashboard breakdowns automatically

---

### 📈 Analytics
Deep insights into your spending habits:

- **Date range selector** — analyze any period up to 12 months back
- **Summary stat cards**: Total Spend · Avg Monthly Bill · Active Subscriptions · Top Category
- **Monthly Bar Chart** — month-by-month spend with highlighted peak spend
- **Category Donut Chart** — percentage breakdown of spend by category
- **Top 5 Subscriptions** table — highest recurring costs ranked

---

### 💱 Multi-Currency Support
- Each subscription can be recorded in **any currency**
- Set a **preferred base currency** for unified display
- All amounts are **auto-converted** using live exchange rates
- Works across dashboard, subscriptions list, and analytics

---

### 🔔 Email Reminders
Never miss a renewal:

- Set **reminder days before** on each subscription (e.g. 3 days before renewal)
- A background **cron job** runs daily and sends reminder emails automatically
- Powered by **Resend** for reliable transactional email delivery

---

### 📱 Mobile App *(Expo / React Native)*
Everything available on the web, in your pocket:

- **Dashboard tab** — live stats with currency conversion
- **Subscriptions tab** — full CRUD, search, filter by status, infinite scroll pagination
- **Analytics tab** — 30-day spend summary with stat cards and insights (top category, payment count)
- **Settings tab** — manage your profile, preferred currency, language, and theme
- **Dark & Light theme** support
- **Localization** — English 🇺🇸 and Japanese 🇯🇵
- **Offline caching** with AsyncStorage for fast load times

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Web Frontend** | Next.js 15 · React 19 · Tailwind CSS v4 · TypeScript · pnpm |
| **Mobile App** | Expo SDK · React Native · TypeScript |
| **Backend API** | Python 3.13 · FastAPI · SQLAlchemy (async) · Alembic |
| **Database** | PostgreSQL 16 |
| **Cache / Queue** | Redis 7 |
| **Email** | Resend |
| **Infrastructure** | Docker Compose · nginx · Let's Encrypt SSL |

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- Git

### 1. Clone & configure

```bash
git clone <repo-url>
cd my-managment-system
```

Copy and fill in the environment file:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set POSTGRES_*, DATABASE_URL, SECRET_KEY, RESEND_API_KEY, etc.
```

If you use the mobile app:

```bash
cp StMS/.env.example StMS/.env
# Edit StMS/.env — set EXPO_PUBLIC_API_URL
```

### 2. Start the stack

```bash
docker compose up --build -d
```

The app will be available at **http://localhost**. nginx proxies `/api/v1/*` requests to the backend.

### 3. Run database migrations

```bash
bash scripts/compose.sh migrate
```

---

## ⚙️ Key Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Public API base path (e.g. `/api/v1`) |
| `INTERNAL_API_URL` | Internal Docker network URL for SSR (e.g. `http://backend:5050/api/v1`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret — generate a strong random value |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) for email |
| `EMAIL_FROM` | Verified sender address (e.g. `no-reply@yourdomain.com`) |
| `INTERNAL_JOB_TOKEN` | UUID token for authenticating internal cron job requests |
| `CORS_ORIGINS` | Comma-separated list of allowed origins |

---

## 🐳 Services

| Service | Description | Port |
|---------|-------------|------|
| `nginx` | Reverse proxy & SSL termination | `80`, `443` |
| `frontend` | Next.js production server | internal |
| `backend` | FastAPI REST API | internal (`5050`) |
| `db` | PostgreSQL 16 database | `5435` (local) |
| `redis` | Redis 7 cache | `6379` (local) |
| `cron` | Scheduled jobs (reminders & renewals) | — |
| `certbot` | Let's Encrypt SSL certificate renewal | — |

---

## 📁 Project Structure

```
├── backend/          # FastAPI API, models, routers, services
├── frontend/         # Next.js web app
├── StMS/             # Expo React Native mobile app
├── nginx/            # nginx configuration & SSL setup
├── scripts/          # Helper scripts (migrations, SSL init, cron)
└── docker-compose.yml
```

---

## 📝 Notes

- Do **not** commit `backend/.env`, `frontend/.env.local`, or `StMS/.env` — they are gitignored.
- The frontend image uses Next.js **standalone output** for minimal Docker image size.
- PostgreSQL is exposed on port `5435` and Redis on `6379` for local development access.
- The backend also has a standalone compose file at `backend/docker-compose.backend.yaml` for isolated API development.
- Before creating a single root git repository, remove nested `.git` directories inside `backend/`, `frontend/`, and `StMS/`.