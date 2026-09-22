import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, type AuthenticatedRequest } from "../middleware/auth.js";
import { generateEmbeddingVector, generateGeminiChatResponse } from "../services/gemini.js";

const router = Router();

const chatSchema = z.object({
  pregunta: z.string().min(1),
});

const mapExerciseRow = (row: any) => ({
  id: row.id,
  entrenadorId: row.entrenador_id,
  nombre: row.nombre,
  grupoMuscular: row.grupo_muscular,
  tecnica: row.tecnica ?? "",
  activo: row.activo,
});

router.post("/", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Pregunta inválida" });
  }

  const question = parsed.data.pregunta;
  const trainerId = req.user!.rol === "alumno" ? req.user!.entrenadorId : req.user!.id;

  if (!trainerId) {
    return res.json({ respuesta: "No hay ejercicios disponibles para tu cuenta.", exercise_ids_recuperados: [] });
  }

  let exerciseRows: any[] = [];
  const questionEmbedding = await generateEmbeddingVector(question, "RETRIEVAL_QUERY");

  if (questionEmbedding) {
    const vectorLiteral = `[${questionEmbedding.join(",")}]`;
    const vectorResult = await db.query(
      `SELECT id, nombre, grupo_muscular, tecnica, errores_comunes, alternativas,
              1 - (embedding <=> $1::vector) AS similitud
       FROM exercises
       WHERE entrenador_id = $2 AND activo = true AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector ASC
       LIMIT 3`,
      [vectorLiteral, trainerId],
    );

    exerciseRows = vectorResult.rows;
  }

  if (!exerciseRows.length) {
    const fallbackResult = await db.query(
      "SELECT * FROM exercises WHERE activo = true AND entrenador_id = $1 ORDER BY created_at DESC",
      [trainerId],
    );

    const exercises = fallbackResult.rows.map(mapExerciseRow);
    const query = question.toLowerCase();
    const matches = exercises.filter((exercise) => {
      const haystack = `${exercise.nombre} ${exercise.grupoMuscular} ${exercise.tecnica ?? ""}`.toLowerCase();
      return haystack.includes(query) || query.includes(haystack);
    });

    exerciseRows = (matches.length ? matches : exercises).slice(0, 5).map((exercise) => ({
      id: exercise.id,
      nombre: exercise.nombre,
      grupo_muscular: exercise.grupoMuscular,
      tecnica: exercise.tecnica,
      errores_comunes: null,
      alternativas: null,
    }));
  }

  const exerciseIdsRecuperados = exerciseRows.map((exercise) => exercise.id as string);
  const contextText = exerciseRows
    .map((exercise) => {
      const detail = [
        `Ejercicio: ${exercise.nombre}`,
        exercise.grupo_muscular ? `Grupo muscular: ${exercise.grupo_muscular}` : null,
        exercise.tecnica ? `Técnica: ${exercise.tecnica}` : null,
        exercise.errores_comunes ? `Errores comunes: ${exercise.errores_comunes}` : null,
        exercise.alternativas ? `Alternativas: ${exercise.alternativas}` : null,
      ]
        .filter(Boolean)
        .join(". ");

      return detail;
    })
    .join("\n---\n");

  const geminiResponse = contextText ? await generateGeminiChatResponse(contextText, question) : null;
  const respuesta =
    geminiResponse ??
    `He revisado ${exerciseIdsRecuperados.length} ejercicios relevantes para tu consulta. En general, prioriza la técnica, el rango de movimiento y la progresión de carga.`;

  await db.query(
    "INSERT INTO chat_logs (usuario_id, pregunta, respuesta, exercise_ids_recuperados, created_at) VALUES ($1, $2, $3, $4, NOW())",
    [req.user!.id, question, respuesta, JSON.stringify(exerciseIdsRecuperados)],
  );

  return res.json({ respuesta, exercise_ids_recuperados: exerciseIdsRecuperados });
});

export default router;
