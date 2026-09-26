# 🏋️ Spartan App

Plataforma web para la gestión de entrenamiento personalizado: permite a un **Entrenador** administrar alumnos, biblioteca de ejercicios y rutinas, y a cada **Alumno** registrar su progreso y resolver dudas de técnica con un asistente virtual impulsado por IA.

🔗 **Demo en vivo:** [spartan-app-lilac.vercel.app](https://spartan-app-lilac.vercel.app/)

📄 **Proceso completo del proyecto:** [docs/project-overview.md](docs/project-overview.md)

---

## 📋 Documentación del proyecto

| Documento | Descripción |
|---|---|
| [Project Overview](docs/project-overview.md) | Motivación, decisiones de arquitectura y proceso de orquestación de IA |

## Índice

- [Sobre el proyecto](#sobre-el-proyecto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Roles de usuario](#roles-de-usuario)
- [Cómo se construyó](#cómo-se-construyó)
- [Cómo correr el proyecto en local](#cómo-correr-el-proyecto-en-local)
- [Variables de entorno](#variables-de-entorno)
- [Endpoints principales](#endpoints-principales)
- [QA y Testing](#qa-y-testing)
- [Roadmap](#roadmap)
- [Autora](#autora)

---

## Sobre el proyecto

Spartan App nació con un doble objetivo: ser una herramienta real de trabajo para un entrenador personal, y a la vez servir como proyecto de práctica end-to-end de QA — desde la especificación hasta el testing formal de una aplicación en producción.

Es una app full-stack con backend en Node.js, base de datos PostgreSQL (con búsqueda vectorial para IA), y un frontend en React. Todo el desarrollo se organizó en fases documentadas, guiando a un agente de IA (GitHub Copilot) con especificaciones técnicas escritas previamente.

## Funcionalidades principales

**Para el Entrenador:**
- Alta y gestión de alumnos (con baja lógica / soft delete)
- Biblioteca de ejercicios, con técnica, errores comunes y alternativas
- Armado de rutinas personalizadas por alumno
- Visualización del progreso y ejecuciones de sus alumnos

**Para el Alumno:**
- Visualización de su rutina asignada del día
- Registro de series, repeticiones, peso y esfuerzo percibido (RPE) por ejercicio
- Consulta de su progreso histórico (planificado vs. ejecutado)
- Asistente virtual con IA para resolver dudas de técnica, basado en la biblioteca de ejercicios de su propio entrenador (RAG)

**Transversal:**
- Autenticación con JWT y control de acceso por rol (RBAC)
- Cambio de contraseña obligatorio en el primer inicio de sesión
- Manejo de concurrencia (ej: qué pasa si un entrenador borra un ejercicio mientras el alumno lo está registrando)

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Tailwind CSS (Dark Mode) |
| Backend | Node.js (API REST) |
| Base de datos | PostgreSQL (Neon, serverless) + pgvector |
| IA / Asistente virtual | Google Gemini API (embeddings + chat, RAG) |
| Autenticación | JWT |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |
| Testing (en progreso) | Postman (API), Playwright (E2E — próximamente) |

## Roles de usuario

| Ruta | Rol permitido |
|---|---|
| `/trainer/*` | Entrenador |
| `/student/*` | Alumno |

El acceso a rutas ajenas al rol propio está bloqueado a nivel de backend y frontend.

## Cómo se construyó

Este proyecto se desarrolló orquestando distintas herramientas de IA en cada etapa, en vez de programar línea por línea manualmente:

1. **Ideación** de la idea y alcance con ChatGPT.
2. **Especificación técnica inicial** redactada con Claude (Anthropic).
3. **Auditoría de contexto** con Gemini Notebook: revisión de ambigüedades, contradicciones y vacíos antes de programar, separando el trabajo en 3 fases.
4. **Desarrollo guiado**, fase por fase, con GitHub Copilot en VS Code, dirigido y validado en cada paso.
5. **Deploy** en Vercel (frontend) y Render (backend), también con asistencia de IA.

El detalle completo de este proceso, incluyendo las decisiones técnicas cerradas en cada fase, está en [docs/project-overview.md](docs/project-overview.md).

## Cómo correr el proyecto en local

### Backend

```bash
npm install
cp .env.example .env
# completar .env con tus valores reales (ver sección Variables de entorno)
npm run dev
```

La API corre en `http://localhost:3000`.

**Base de datos:**
1. Crear una base PostgreSQL llamada `spartan_app` (o usar una instancia de Neon).
2. Completar `DATABASE_URL` en `.env`.
3. Ejecutar el schema: `psql -d spartan_app -f database/schema.sql`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# completar VITE_API_URL (ver sección Variables de entorno)
npm run dev
```

## Variables de entorno

Hay dos archivos `.env` independientes — uno para el backend (raíz) y otro para el frontend (`frontend/`). Ambos tienen un `.env.example` versionado con valores de ejemplo; **el `.env` real nunca debe subirse al repositorio**.

### Backend (`.env`, raíz)

```env
PORT=3000
JWT_SECRET=replace_with_private_secret
DATABASE_URL=postgresql://user:password@your-neon-host/spartan_app?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_CHAT_MODEL=gemini-1.5-flash
DEFAULT_COACH_EMAIL=your_private_coach_email
DEFAULT_COACH_PASSWORD=replace_with_private_password
DEFAULT_STUDENT_EMAIL=your_private_student_email
DEFAULT_STUDENT_PASSWORD=replace_with_private_password
```

En producción, estos valores se configuran como variables de entorno en el dashboard de Render, no en un archivo subido al repo.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

| Ambiente | Valor de `VITE_API_URL` | Dónde se configura |
|---|---|---|
| Desarrollo local | `http://localhost:3000` | `frontend/.env` (no versionado) |
| Producción | URL del backend en Render (ej: `https://spartanapp-backend.onrender.com`) | Panel de Vercel → Settings → Environment Variables |

⚠️ Al ser Vite, esta variable se incorpora al código en el momento del build. Si se cambia en Vercel, hace falta un redeploy para que tome efecto.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Perfil del usuario autenticado |
| POST | `/api/auth/change-password` | Cambio de contraseña |
| GET / POST | `/api/students` | Listado / alta de alumnos (Entrenador) |
| GET / POST | `/api/exercises` | Biblioteca de ejercicios |
| GET / POST | `/api/routines` | Rutinas asignadas |
| GET / POST | `/api/executions` | Registro de ejecuciones (Alumno) |
| GET | `/api/progress/:student_id/:exercise_id` | Progreso planificado vs. ejecutado |
| POST | `/api/chat` | Asistente virtual (RAG) |

## QA y Testing

Este proyecto se está testeando de forma incremental, fase por fase, con freeze de desarrollo durante cada ciclo de testing. El proceso completo —Test Plan, matriz de casos de prueba, bugs encontrados y versionado con Git tags— estará documentado en [`docs/`](docs).

**Estado actual:** Armado de Test Plan y Fase 1 (autenticación, RBAC, reglas de negocio base) en diseño de casos de prueba, previo a la ejecución.

## Roadmap

- [ ] Ejecución de la matriz de TCs de Fase 1
- [ ] Matriz de TCs de Fase 2 (backend / RAG)
- [ ] Matriz de TCs de Fase 3 (frontend / UX)
- [ ] Automatización E2E con Playwright (los componentes ya cuentan con `data-testid`)
- [ ] Registro de bugs y ciclo de fixes documentado

## Autora

**Noelia Juncos** — QA Manual & Automation
📍 Córdoba, Argentina
🔗 [LinkedIn](https://linkedin.com/in/noelia-juncos-qa) · [GitHub](https://github.com/NoeJuncos)