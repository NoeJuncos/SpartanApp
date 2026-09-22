import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const createRoutineSchema = z.object({
  alumno_id: z.string().min(1),
  nombre: z.string().min(1),
  exercises: z.array(
    z.object({
      exercise_id: z.string().min(1),
      series_planificadas: z.number().int().positive(),
      repeticiones_planificadas: z.number().int().positive(),
      peso_planificado: z.number().nonnegative(),
    }),
  ),
});

const mapRoutineRow = (row: any) => ({
  id: row.id,
  entrenadorId: row.entrenador_id,
  alumnoId: row.alumno_id,
  nombre: row.nombre,
  activo: row.activo,
  createdAt: new Date(row.created_at),
});

const mapRoutineExerciseRow = (row: any) => ({
  id: row.id,
  routineId: row.routine_id,
  exerciseId: row.exercise_id,
  seriesPlanificadas: row.series_planificadas,
  repeticionesPlanificadas: row.repeticiones_planificadas,
  pesoPlanificado: Number(row.peso_planificado),
  orden: row.orden,
  activo: row.activo,
});

router.get("/", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  if (req.user.rol === "entrenador") {
    const studentId = req.query.student_id as string | undefined;

    let query = "SELECT * FROM routines WHERE activo = true AND entrenador_id = $1";
    const params: any[] = [req.user.id];

    if (studentId) {
      query += " AND alumno_id = $2";
      params.push(studentId);
    }

    query += " ORDER BY created_at DESC";

    const result = await db.query(query, params);
    return res.json(result.rows.map(mapRoutineRow));
  }

  const result = await db.query(
    "SELECT * FROM routines WHERE activo = true AND alumno_id = $1 ORDER BY created_at DESC",
    [req.user.id],
  );

  return res.json(result.rows.map(mapRoutineRow));
});

router.get("/:id/exercises", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  const routineResult = await db.query("SELECT * FROM routines WHERE id = $1 LIMIT 1", [req.params.id]);

  if (!routineResult.rowCount) {
    return res.status(404).json({ message: "Rutina no encontrada" });
  }

  const routine = routineResult.rows[0];

  if (req.user?.rol === "alumno" && routine.alumno_id !== req.user.id) {
    return res.status(403).json({ message: "No puedes ver una rutina ajena" });
  }

  if (req.user?.rol === "entrenador" && routine.entrenador_id !== req.user.id) {
    return res.status(403).json({ message: "No puedes ver una rutina ajena" });
  }

  const result = await db.query(
    `SELECT re.id,
            re.exercise_id,
            re.series_planificadas,
            re.repeticiones_planificadas,
            re.peso_planificado,
            re.orden,
            re.activo,
            e.nombre,
            e.grupo_muscular,
            e.tecnica,
            e.errores_comunes,
            e.alternativas
     FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = $1 AND re.activo = true
     ORDER BY re.orden ASC`,
    [req.params.id],
  );

  return res.json(result.rows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    nombre: row.nombre,
    grupoMuscular: row.grupo_muscular,
    tecnica: row.tecnica,
    erroresComunes: row.errores_comunes,
    alternativas: row.alternativas,
    seriesPlanificadas: Number(row.series_planificadas),
    repeticionesPlanificadas: Number(row.repeticiones_planificadas),
    pesoPlanificado: Number(row.peso_planificado),
    orden: Number(row.orden),
    activo: row.activo,
  })));
});

router.post("/", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const parsed = createRoutineSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const studentResult = await db.query(
    "SELECT * FROM users WHERE id = $1 AND rol = 'alumno' AND activo = true LIMIT 1",
    [parsed.data.alumno_id],
  );

  if (!studentResult.rowCount || studentResult.rows[0].entrenador_id !== req.user!.id) {
    return res.status(403).json({ message: "El alumno no pertenece a este entrenador" });
  }

  const routineResult = await db.query(
    "INSERT INTO routines (entrenador_id, alumno_id, nombre, activo, created_at) VALUES ($1, $2, $3, true, NOW()) RETURNING *",
    [req.user!.id, parsed.data.alumno_id, parsed.data.nombre],
  );

  const routine = mapRoutineRow(routineResult.rows[0]);
  const exercises: any[] = [];

  for (const [index, exerciseItem] of parsed.data.exercises.entries()) {
    const exerciseResult = await db.query(
      "SELECT * FROM exercises WHERE id = $1 AND activo = true AND entrenador_id = $2 LIMIT 1",
      [exerciseItem.exercise_id, req.user!.id],
    );

    if (!exerciseResult.rowCount) {
      return res.status(400).json({ message: "Uno o más ejercicios no pertenecen al entrenador" });
    }

    const insertedRoutineExercise = await db.query(
      `INSERT INTO routine_exercises (
        routine_id, exercise_id, series_planificadas,
        repeticiones_planificadas, peso_planificado, orden, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [
        routine.id,
        exerciseItem.exercise_id,
        exerciseItem.series_planificadas,
        exerciseItem.repeticiones_planificadas,
        exerciseItem.peso_planificado,
        index + 1,
      ],
    );

    exercises.push(mapRoutineExerciseRow(insertedRoutineExercise.rows[0]));
  }

  return res.status(201).json({ routine, exercises });
});

export default router;
