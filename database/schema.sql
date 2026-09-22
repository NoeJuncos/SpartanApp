CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE rol_enum AS ENUM ('entrenador', 'alumno');
CREATE TYPE plan_enum AS ENUM ('2x_semana', '3x_semana', '5x_semana');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol rol_enum NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_baja TIMESTAMPTZ NULL,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entrenador_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    apellido VARCHAR(100) NULL,
    edad INTEGER NULL,
    whatsapp VARCHAR(30) NULL,
    plan plan_enum NULL,
    horario VARCHAR(100) NULL,

    CONSTRAINT check_alumno_fields CHECK (
        (rol = 'entrenador') OR 
        (rol = 'alumno' AND entrenador_id IS NOT NULL AND apellido IS NOT NULL)
    )
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    grupo_muscular VARCHAR(100) NOT NULL,
    video_url TEXT NULL,
    tecnica TEXT NULL,
    errores_comunes TEXT NULL,
    alternativas TEXT NULL,
    embedding vector(768) NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    alumno_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    series_planificadas SMALLINT NOT NULL CHECK (series_planificadas > 0),
    repeticiones_planificadas SMALLINT NOT NULL CHECK (repeticiones_planificadas > 0),
    peso_planificado NUMERIC(6,2) NOT NULL CHECK (peso_planificado >= 0),
    orden SMALLINT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_exercise_id UUID NOT NULL REFERENCES routine_exercises(id) ON DELETE RESTRICT,
    alumno_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    peso_ejecutado NUMERIC(6,2) NOT NULL CHECK (peso_ejecutado >= 0),
    repeticiones_ejecutadas SMALLINT NOT NULL CHECK (repeticiones_ejecutadas > 0),
    series_ejecutadas SMALLINT NULL CHECK (series_ejecutadas > 0),
    rpe SMALLINT NULL CHECK (rpe BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    exercise_ids_recuperados JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_entrenador ON users(entrenador_id) WHERE rol = 'alumno';
CREATE INDEX idx_exercises_entrenador ON exercises(entrenador_id);
CREATE INDEX idx_routines_alumno ON routines(alumno_id);
CREATE INDEX idx_executions_alumno_date ON executions(alumno_id, fecha);
CREATE INDEX idx_executions_routine_ex ON executions(routine_exercise_id);

CREATE INDEX idx_exercises_embedding ON exercises
USING hnsw (embedding vector_cosine_ops)
WHERE activo = true AND embedding IS NOT NULL;
