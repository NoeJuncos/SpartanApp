# Spartan App

Spartan App is a training and coaching platform that combines a React frontend with a Node.js backend and a Neon Postgres database. The application is designed to manage athletes, exercises, routines, execution tracking, progress, authentication, and AI-assisted support for exercise-related questions.

## Architecture

This repository is organized as a small monorepo:

- Frontend: `frontend/` — React + TypeScript + Vite
- Backend: root project — Express + TypeScript + PostgreSQL
- Database: Neon Postgres
- AI layer: Google Gemini for embeddings and conversational assistance
- Deployment: Vercel for the frontend and Render for the backend

## Stack

- React 19 + Vite
- TypeScript
- Express
- Neon / PostgreSQL
- JWT authentication
- Google Gemini API
- Zod validation

## Features

- Coach and student authentication
- Student management
- Exercise catalog and search
- Routine creation and assignment
- Execution tracking and historical data
- Progress review by student and exercise
- AI coach chat grounded in exercise context
- Health check endpoint to verify API and database status

## Repository structure

```bash
.
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
├── src/
│   ├── bootstrap.ts
│   ├── db.ts
│   ├── index.ts
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── security.ts
├── database/
│   └── schema.sql
├── package.json
├── tsconfig.json
├── README.md
└── .env
```

## Local development

### 1) Backend

Install dependencies and start the API:

```bash
npm install
npm run dev
```

The backend runs by default on `http://localhost:3000`.

### 2) Frontend

Run the web app separately:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs by default on the Vite local port.

### 3) Environment variables

Create a `.env` file in the project root for the backend:

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
NEON_BRANCH=production
GEMINI_API_KEY="..."
DEFAULT_COACH_EMAIL="coachagus@spartan.com"
DEFAULT_COACH_PASSWORD="123456"
DEFAULT_STUDENT_EMAIL="alumno@spartan.com"
DEFAULT_STUDENT_PASSWORD="123456"
```

For the frontend, set the API base URL in a Vite environment variable:

```env
VITE_API_URL=http://localhost:3000/api
```

## Database setup

Initialize the schema with PostgreSQL:

```bash
psql -d <database_name> -f database/schema.sql
```

The app is designed to work with Neon Postgres, and the backend initializes the needed database structure when it starts.

## Health check

```bash
GET /health
```

Returns the API status and whether the database is reachable.

## Main API routes

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Exercises

- `GET /api/exercises`
- `POST /api/exercises`

### Students

- `GET /api/students`
- `POST /api/students`

### Routines

- `GET /api/routines`
- `POST /api/routines`

### Executions

- `GET /api/executions`
- `POST /api/executions`

### Progress

- `GET /api/progress/:student_id/:exercise_id`

### Chat

- `POST /api/chat`

## Deployment

This project is designed to be deployed in a split architecture:

- Frontend deployed on Vercel
- Backend deployed on Render
- Database hosted on Neon

This is a common setup for React apps plus an API backend, and it is relevant for documentation because the frontend depends on the backend URL through `VITE_API_URL`.

### Vercel

The frontend app in `frontend/` is compatible with Vercel, and the project already includes a basic `vercel.json` configuration for SPA routing.

### Render

The root backend service is intended to run on Render with the environment variables configured as secrets.

## Security

Sensitive values such as `DATABASE_URL`, `GEMINI_API_KEY`, and credential defaults should remain in local environment files or deployment secret managers. Do not commit them to Git.

## Notes

This project is not just a template; it is a working training platform backend and frontend with real business logic, DB integration, and AI support. The documentation reflects the actual architecture and deployment model used for the app.
