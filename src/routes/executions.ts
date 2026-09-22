import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const createExecutionSchema = z.object({
  routine_exercise_id: z.string().min(1),
  fecha: z.string().optional(),
  peso_ejecutado: z.number().nonnegative(),
  repeticiones_ejecutadas: z.number().int().positive(),
  series_ejecutadas: z.number().int().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
});

const mapExecutionRow = (row: any) => ({
  id: row.id,
  routineExerciseId: row.routine_exercise_id,
  alumnoId: row.alumno_id,
  fecha: row.fecha,
  pesoEjecutado: Number(row.peso_ejecutado),
  repeticionesEjecutadas: row.repeticiones_ejecutadas,
  seriesEjecutadas: row.series_ejecutadas ?? null,
  rpe: row.rpe ?? null,
  createdAt: new Date(row.created_at),
});

router.get("/", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  if (req.user.rol === "entrenador") {
    const studentId = req.query.student_id as string | undefined;

    let query = `
      SELECT e.*
      FROM executions e
      JOIN routine_exercises re ON re.id = e.routine_exercise_id
      JOIN routines r ON r.id = re.routine_id
      WHERE r.entrenador_id = $1
    `;
    const params: any[] = [req.user.id];

    if (studentId) {
      query += " AND e.alumno_id = $2";
      params.push(studentId);
    }

    query += " ORDER BY e.created_at DESC";

    const result = await db.query(query, params);
    return res.json(result.rows.map(mapExecutionRow));
  }

  const result = await db.query(
    "SELECT * FROM executions WHERE alumno_id = $1 ORDER BY created_at DESC",
    [req.user.id],
  );

  return res.json(result.rows.map(mapExecutionRow));
});

router.post("/", authMiddleware, requirePasswordChangeResolved, requireRole("alumno"), async (req: AuthenticatedRequest, res) => {
  const parsed = createExecutionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const routineExerciseResult = await db.query(
    `SELECT re.*, r.alumno_id, r.activo as routine_activo
     FROM routine_exercises re
     JOIN routines r ON r.id = re.routine_id
     WHERE re.id = $1 AND re.activo = true AND r.activo = true
     LIMIT 1`,
    [parsed.data.routine_exercise_id],
  );

  if (!routineExerciseResult.rowCount) {
    return res.status(400).json({ message: "Ejercicio no válido o inactivo en la rutina" });
  }

  const routineExercise = routineExerciseResult.rows[0];

  if (!routineExercise.activo || !routineExercise.routine_activo) {
    return res.status(400).json({
      message: "El ejercicio fue removido de tu rutina por tu entrenador. Por favor recarga la página.",
    });
  }

  if (routineExercise.alumno_id !== req.user!.id) {
    return res.status(403).json({ message: "No puedes registrar ejecuciones en una rutina ajena" });
  }

  const result = await db.query(
    `INSERT INTO executions (
      routine_exercise_id, alumno_id, fecha,
      peso_ejecutado, repeticiones_ejecutadas, series_ejecutadas, rpe, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [
      parsed.data.routine_exercise_id,
      req.user!.id,
      parsed.data.fecha ?? new Date().toISOString().slice(0, 10),
      parsed.data.peso_ejecutado,
      parsed.data.repeticiones_ejecutadas,
      parsed.data.series_ejecutadas ?? null,
      parsed.data.rpe ?? null,
    ],
  );

  return res.status(201).json(mapExecutionRow(result.rows[0]));
});

export default router;
