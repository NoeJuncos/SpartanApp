import bcrypt from "bcryptjs";
import type { Exercise, Execution, Routine, RoutineExercise, User, ChatLog } from "./types.js";

const hash = bcrypt.hashSync("12345678", 10);

export const store: {
  users: User[];
  exercises: Exercise[];
  routines: Routine[];
  routineExercises: RoutineExercise[];
  executions: Execution[];
  chatLogs: ChatLog[];
} = {
  users: [
    {
      id: "coach_1",
      email: "coach@spartan.app",
      passwordHash: hash,
      rol: "entrenador",
      nombre: "Coach",
      activo: true,
      fechaBaja: null,
      debeCambiarPassword: false,
      createdAt: new Date(),
      entrenadorId: null,
      apellido: null,
      edad: null,
      whatsapp: null,
      plan: null,
      horario: null,
    } as User,
    {
      id: "student_1",
      email: "alumno@spartan.app",
      passwordHash: hash,
      rol: "alumno",
      nombre: "Alumno",
      activo: true,
      fechaBaja: null,
      debeCambiarPassword: false,
      createdAt: new Date(),
      entrenadorId: "coach_1",
      apellido: "Tester",
      edad: 28,
      whatsapp: "+5491112345678",
      plan: "3x_semana",
      horario: "Lunes / Miércoles / Viernes",
    } as User,
  ],
  exercises: [
    {
      id: "exercise_1",
      entrenadorId: "coach_1",
      nombre: "Press de banca",
      grupoMuscular: "Pecho",
      videoUrl: "https://example.com/press.mp4",
      tecnica: "Mantener el core activado y la barra controlada.",
      erroresComunes: "Bajar los codos demasiado",
      alternativas: "Press inclinado",
      embedding: [0.12, 0.34, 0.9],
      activo: true,
      createdAt: new Date(),
    } as Exercise,
    {
      id: "exercise_2",
      entrenadorId: "coach_1",
      nombre: "Sentadilla",
      grupoMuscular: "Piernas",
      videoUrl: "https://example.com/squat.mp4",
      tecnica: "Mantener la espalda neutra y la mirada al frente.",
      erroresComunes: "Cadera muy atrás",
      alternativas: "Goblet squat",
      embedding: [0.44, 0.21, 0.88],
      activo: true,
      createdAt: new Date(),
    } as Exercise,
  ],
  routines: [
    {
      id: "routine_1",
      entrenadorId: "coach_1",
      alumnoId: "student_1",
      nombre: "Rutina base",
      activo: true,
      createdAt: new Date(),
    } as Routine,
  ],
  routineExercises: [
    {
      id: "re_1",
      routineId: "routine_1",
      exerciseId: "exercise_1",
      seriesPlanificadas: 4,
      repeticionesPlanificadas: 8,
      pesoPlanificado: 60,
      orden: 1,
      activo: true,
    } as RoutineExercise,
    {
      id: "re_2",
      routineId: "routine_1",
      exerciseId: "exercise_2",
      seriesPlanificadas: 4,
      repeticionesPlanificadas: 10,
      pesoPlanificado: 50,
      orden: 2,
      activo: true,
    } as RoutineExercise,
  ],
  executions: [
    {
      id: "exec_1",
      routineExerciseId: "re_1",
      alumnoId: "student_1",
      fecha: "2026-09-01",
      pesoEjecutado: 60,
      repeticionesEjecutadas: 8,
      seriesEjecutadas: 4,
      rpe: 8,
      createdAt: new Date(),
    } as Execution,
    {
      id: "exec_2",
      routineExerciseId: "re_2",
      alumnoId: "student_1",
      fecha: "2026-09-03",
      pesoEjecutado: 50,
      repeticionesEjecutadas: 10,
      seriesEjecutadas: 4,
      rpe: 7,
      createdAt: new Date(),
    } as Execution,
  ],
  chatLogs: [] as ChatLog[],
};

export const nextId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
