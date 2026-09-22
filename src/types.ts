export type Role = "entrenador" | "alumno";
export type Plan = "2x_semana" | "3x_semana" | "5x_semana";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  rol: Role;
  nombre: string;
  activo: boolean;
  fechaBaja?: Date | null;
  debeCambiarPassword: boolean;
  createdAt: Date;
  entrenadorId?: string | null;
  apellido?: string | null;
  edad?: number | null;
  whatsapp?: string | null;
  plan?: Plan | null;
  horario?: string | null;
}

export interface Exercise {
  id: string;
  entrenadorId: string;
  nombre: string;
  grupoMuscular: string;
  videoUrl?: string | null;
  tecnica?: string | null;
  erroresComunes?: string | null;
  alternativas?: string | null;
  embedding?: number[] | null;
  activo: boolean;
  createdAt: Date;
}

export interface Routine {
  id: string;
  entrenadorId: string;
  alumnoId: string;
  nombre: string;
  activo: boolean;
  createdAt: Date;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  seriesPlanificadas: number;
  repeticionesPlanificadas: number;
  pesoPlanificado: number;
  orden: number;
  activo: boolean;
}

export interface Execution {
  id: string;
  routineExerciseId: string;
  alumnoId: string;
  fecha: string;
  pesoEjecutado: number;
  repeticionesEjecutadas: number;
  seriesEjecutadas?: number | null;
  rpe?: number | null;
  createdAt: Date;
}

export interface ChatLog {
  id: string;
  usuarioId: string;
  pregunta: string;
  respuesta: string;
  exerciseIdsRecuperados: string[];
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  rol: Role;
  nombre: string;
  entrenadorId?: string | null;
  debeCambiarPassword: boolean;
}
