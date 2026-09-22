import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { authMiddleware, requirePasswordChangeResolved, type AuthenticatedRequest } from "../middleware/auth.js";
import { comparePassword, hashPassword, signToken } from "../security.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  new_password: z.string().min(8),
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

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const { email, password } = parsed.data;
  const result = await db.query(
    `SELECT * FROM users WHERE lower(email) = lower($1) AND activo = true LIMIT 1`,
    [email],
  );

  const user = result.rowCount ? mapUserRow(result.rows[0]) : null;

  if (!user) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    rol: user.rol,
    nombre: user.nombre,
    entrenadorId: user.entrenadorId ?? null,
    debeCambiarPassword: user.debeCambiarPassword,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      rol: user.rol,
      nombre: user.nombre,
      debe_cambiar_password: user.debeCambiarPassword,
    },
  });
});

router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  const result = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [req.user.id]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const user = mapUserRow(result.rows[0]);

  return res.json({
    id: user.id,
    email: user.email,
    rol: user.rol,
    nombre: user.nombre,
    apellido: user.apellido ?? null,
    whatsapp: user.whatsapp ?? null,
    plan: user.plan ?? null,
    horario: user.horario ?? null,
    debe_cambiar_password: user.debeCambiarPassword,
  });
});

router.post("/change-password", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Nueva contraseña inválida" });
  }

  const result = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [req.user?.id]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const passwordHash = await hashPassword(parsed.data.new_password);

  await db.query(
    "UPDATE users SET password_hash = $1, debe_cambiar_password = false WHERE id = $2",
    [passwordHash, req.user!.id],
  );

  return res.json({ message: "Contraseña actualizada correctamente" });
});

export default router;
