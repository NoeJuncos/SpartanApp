# Spartan App Backend

This project is a working backend scaffold for the Spartan App Phase 1 specification. It includes a basic JWT-authenticated API, role-based access control, in-memory persistence, and the main business flows for exercises, students, routines, executions, progress, and chat.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The API will run on http://localhost:3000.

## PostgreSQL setup

1. Create a PostgreSQL database named `spartan_app`.
2. Fill in `.env` with your real `DATABASE_URL`.
3. Run the SQL schema from `database/schema.sql`.

Example:

```bash
psql -d spartan_app -f database/schema.sql
```

## Private credentials

Default app users are created from environment variables and should never be committed to a public repository. Set your private values in `.env` or in your deployment platform secrets.

## Main routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET /api/exercises`
- `POST /api/exercises`
- `GET /api/students`
- `POST /api/students`
- `GET /api/routines`
- `POST /api/routines`
- `GET /api/executions`
- `POST /api/executions`
- `GET /api/progress/:student_id/:exercise_id`
- `POST /api/chat`

## Notes

This scaffold uses in-memory data so the project is runnable without external infrastructure. It is intended as a starting point to be replaced by PostgreSQL/pgvector for production.
