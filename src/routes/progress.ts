import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/:student_id/:exercise_id", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  const { student_id, exercise_id } = req.params;

  if (req.user?.rol === "alumno" && req.user.id !== student_id) {
    return res.status(403).json({ message: "No puedes consultar progreso ajeno" });
  }

  if (req.user?.rol === "entrenador") {
    const studentResult = await db.query("SELECT * FROM users WHERE id = $1 AND rol = 'alumno' LIMIT 1", [student_id]);

    if (!studentResult.rowCount || studentResult.rows[0].entrenador_id !== req.user.id) {
      return res.status(403).json({ message: "No puedes consultar progreso de un alumno ajeno" });
    }
  }

  const plannedResult = await db.query(
    `SELECT re.peso_planificado, r.created_at
     FROM routine_exercises re
     JOIN routines r ON r.id = re.routine_id
     WHERE re.exercise_id = $1 AND r.alumno_id = $2 AND re.activo = true AND r.activo = true
     ORDER BY r.created_at ASC`,
    [exercise_id, student_id],
  );

  const plannedHistory = plannedResult.rows.map((row) => ({
    date: new Date(row.created_at).toISOString().slice(0, 10),
    planned: Number(row.peso_planificado),
    type: "planned",
  }));

  const executedResult = await db.query(
    `SELECT e.fecha, e.peso_ejecutado
     FROM executions e
     JOIN routine_exercises re ON re.id = e.routine_exercise_id
     WHERE e.alumno_id = $1 AND re.exercise_id = $2
     ORDER BY e.fecha ASC`,
    [student_id, exercise_id],
  );

  const executedHistory = executedResult.rows.map((row) => ({
    date: row.fecha,
    executed: Number(row.peso_ejecutado),
    type: "executed",
  }));

  return res.json({
    student_id,
    exercise_id,
    planned: plannedHistory,
    executed: executedHistory,
  });
});

export default router;
