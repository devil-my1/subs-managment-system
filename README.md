# My Management System Docker Stack

This repository now includes a root Docker Compose stack that runs the website behind nginx.

The root [docker-compose.yml](docker-compose.yml) is the primary stack for deployment and full-stack local runs. The backend folder also contains a separate backend-only compose file at [backend/docker-compose.backend.yaml](backend/docker-compose.backend.yaml) for isolated API development.

## Services

- `nginx`: public entrypoint on port `80`
- `frontend`: Next.js production server
- `backend`: FastAPI API server
- `db`: PostgreSQL 16
- `redis`: Redis 7
- `cron`: scheduled reminder and renewal jobs

## Run

1. Copy or update `backend/.env` from `backend/.env.example`.
2. Keep `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL` aligned inside `backend/.env`.
3. If you use the mobile app, create `StMS/.env` from `StMS/.env.example`.
3. Start the stack from the repository root:

```bash
docker compose up --build -d
```

The website will be available at `http://localhost` and nginx will proxy API requests from `/api/v1` to the backend container.

## Important environment values

- `NEXT_PUBLIC_API_URL=/api/v1`
- `INTERNAL_API_URL=http://backend:5050/api/v1`
- `CORS_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:3000,http://127.0.0.1:3000`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL` should describe the same database credentials

## Upload notes

- Do not commit `backend/.env`, `frontend/.env.local`, or `StMS/.env`.
- The root `.gitignore` is set up for a single combined repository.
- Before creating one root git repository, remove or archive the nested `.git` directories inside `backend`, `frontend`, and `StMS` so they do not stay as separate repositories.

## Notes

- The frontend image is built in production mode using Next.js standalone output.
- nginx forwards app traffic to the frontend container and API traffic to the backend container.
- PostgreSQL is published on port `5435` and Redis on `6379` for local access.