import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { hashPassword } from "../security.js";

const router = Router();

const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  edad: z.number().int().positive().optional(),
  whatsapp: z.string().min(1),
  plan: z.enum(["2x_semana", "3x_semana", "5x_semana"]),
  horario: z.string().optional().nullable(),
});

const mapUserRow = (row: any) => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  rol: row.rol,
  nombre: row.nombre,
  activo: row.activo,
  fechaBaja: row.fecha_baja ? new Date(row.fecha_baja) : null,
  debeCambiarPassword: row.debe_cambiar_password,
  createdAt: new Date(row.created_at),
  entrenadorId: row.entrenador_id ?? null,
  apellido: row.apellido ?? null,
  edad: row.edad ?? null,
  whatsapp: row.whatsapp ?? null,
  plan: row.plan ?? null,
  horario: row.horario ?? null,
});

router.get("/", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const result = await db.query(
    "SELECT * FROM users WHERE rol = 'alumno' AND activo = true AND entrenador_id = $1 ORDER BY created_at DESC",
    [req.user!.id],
  );

  return res.json(result.rows.map(mapUserRow));
});

router.post("/", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const parsed = createStudentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const existing = await db.query("SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1", [parsed.data.email]);

  if (existing.rowCount) {
    return res.status(409).json({ message: "El email ya existe" });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const result = await db.query(
    `INSERT INTO users (
      email, password_hash, rol, nombre, activo, fecha_baja,
      debe_cambiar_password, created_at, entrenador_id,
      apellido, edad, whatsapp, plan, horario
    ) VALUES (
      $1, $2, 'alumno', $3, true, NULL,
      true, NOW(), $4,
      $5, $6, $7, $8, $9
    ) RETURNING *`,
    [
      parsed.data.email,
      passwordHash,
      parsed.data.nombre,
      req.user!.id,
      parsed.data.apellido,
      parsed.data.edad ?? null,
      parsed.data.whatsapp,
      parsed.data.plan,
      parsed.data.horario ?? null,
    ],
  );

  const student = mapUserRow(result.rows[0]);

  return res.status(201).json({
    id: student.id,
    email: student.email,
    nombre: student.nombre,
    apellido: student.apellido,
    plan: student.plan,
    whatsapp: student.whatsapp,
  });
});

router.delete("/:id", authMiddleware, requirePasswordChangeResolved, requireRole("entrenador"), async (req: AuthenticatedRequest, res) => {
  const studentResult = await db.query("SELECT * FROM users WHERE id = $1 AND rol = 'alumno' LIMIT 1", [req.params.id]);

  if (!studentResult.rowCount) {
    return res.status(404).json({ message: "Alumno no encontrado" });
  }

  const student = mapUserRow(studentResult.rows[0]);

  if (student.entrenadorId !== req.user!.id) {
    return res.status(403).json({ message: "No puedes dar de baja un alumno ajeno" });
  }

  await db.query(
    "UPDATE users SET activo = false, fecha_baja = NOW() WHERE id = $1 AND entrenador_id = $2",
    [req.params.id, req.user!.id],
  );

  return res.json({ message: "Alumno dado de baja" });
});

export default router;
