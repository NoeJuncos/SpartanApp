import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { buildExerciseEmbeddingText, generateEmbeddingVector } from "../services/gemini.js";

const router = Router();

const persistExerciseEmbedding = async (exerciseId: string) => {
  const result = await db.query("SELECT * FROM exercises WHERE id = $1 LIMIT 1", [exerciseId]);

  if (!result.rowCount) {
    return;
  }

  const exercise = result.rows[0];
  const embeddingText = buildExerciseEmbeddingText({
    nombre: exercise.nombre,
    grupoMuscular: exercise.grupo_muscular,
    tecnica: exercise.tecnica,
    erroresComunes: exercise.errores_comunes,
    alternativas: exercise.alternativas,
  });

  const embedding = await generateEmbeddingVector(embeddingText, "RETRIEVAL_DOCUMENT");

  if (embedding) {
    await db.query("UPDATE exercises SET embedding = $1::vector WHERE id = $2", [`[${embedding.join(",")}]`, exerciseId]);
  }
};

const createExerciseSchema = z.object({
  nombre: z.string().min(1),
  grupo_muscular: z.string().min(1),
  video_url: z.string().optional().nullable(),
  tecnica: z.string().optional().nullable(),
  errores_comunes: z.string().optional().nullable(),
  alternativas: z.string().optional().nullable(),
});

const mapExerciseRow = (row: any) => ({
  id: row.id,
  entrenadorId: row.entrenador_id,
  nombre: row.nombre,
  grupoMuscular: row.grupo_muscular,
  videoUrl: row.video_url ?? null,
  tecnica: row.tecnica ?? null,
  erroresComunes: row.errores_comunes ?? null,
  alternativas: row.alternativas ?? null,
  embedding: row.embedding ?? null,
  activo: row.activo,
  createdAt: new Date(row.created_at),
});

router.get("/", authMiddleware, requirePasswordChangeResolved, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  const trainerId = req.user.rol === "entrenador" ? req.user.id : req.user.entrenadorId;

  if (!trainerId) {
    return res.json([]);
  }

  const result = await db.query(
    "SELECT * FROM exercises WHERE activo = true AND entrenador_id = $1 ORDER BY created_at DESC",
    [trainerId],
  );

  return res.json(result.rows.map(mapExerciseRow));
});

router.post("/", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const parsed = createExerciseSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const result = await db.query(
    `INSERT INTO exercises (
      entrenador_id, nombre, grupo_muscular, video_url,
      tecnica, errores_comunes, alternativas, embedding, activo, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true, NOW()) RETURNING *`,
    [
      req.user!.id,
      parsed.data.nombre,
      parsed.data.grupo_muscular,
      parsed.data.video_url ?? null,
      parsed.data.tecnica ?? null,
      parsed.data.errores_comunes ?? null,
      parsed.data.alternativas ?? null,
    ],
  );

  const savedExercise = mapExerciseRow(result.rows[0]);
  void persistExerciseEmbedding(savedExercise.id);

  return res.status(201).json(savedExercise);
});

router.put("/:id", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const existingResult = await db.query("SELECT * FROM exercises WHERE id = $1 LIMIT 1", [req.params.id]);

  if (!existingResult.rowCount) {
    return res.status(404).json({ message: "Ejercicio no encontrado" });
  }

  const exercise = existingResult.rows[0];

  if (exercise.entrenador_id !== req.user!.id) {
    return res.status(403).json({ message: "No puedes modificar un ejercicio ajeno" });
  }

  const nombre = req.body.nombre ?? exercise.nombre;
  const grupoMuscular = req.body.grupo_muscular ?? exercise.grupo_muscular;
  const videoUrl = req.body.video_url ?? exercise.video_url ?? null;
  const tecnica = req.body.tecnica ?? exercise.tecnica ?? null;
  const erroresComunes = req.body.errores_comunes ?? exercise.errores_comunes ?? null;
  const alternativas = req.body.alternativas ?? exercise.alternativas ?? null;

  const updateResult = await db.query(
    `UPDATE exercises
      SET nombre = $1,
          grupo_muscular = $2,
          video_url = $3,
          tecnica = $4,
          errores_comunes = $5,
          alternativas = $6
      WHERE id = $7 AND entrenador_id = $8
      RETURNING *`,
    [nombre, grupoMuscular, videoUrl, tecnica, erroresComunes, alternativas, req.params.id, req.user!.id],
  );

  const updatedExercise = mapExerciseRow(updateResult.rows[0]);
  void persistExerciseEmbedding(updatedExercise.id);

  return res.json(updatedExercise);
});

router.delete("/:id", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const existingResult = await db.query("SELECT * FROM exercises WHERE id = $1 LIMIT 1", [req.params.id]);

  if (!existingResult.rowCount) {
    return res.status(404).json({ message: "Ejercicio no encontrado" });
  }

  const exercise = existingResult.rows[0];

  if (exercise.entrenador_id !== req.user!.id) {
    return res.status(403).json({ message: "No puedes eliminar un ejercicio ajeno" });
  }

  await db.query("UPDATE exercises SET activo = false WHERE id = $1 AND entrenador_id = $2", [req.params.id, req.user!.id]);

  return res.json({ message: "Ejercicio dado de baja" });
});

export default router;
