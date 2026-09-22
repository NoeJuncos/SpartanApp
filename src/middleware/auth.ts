import type { NextFunction, Request, Response } from "express";
import { db } from "../db.js";
import { verifyToken } from "../security.js";
import type { AuthUser, Role } from "../types.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const mapUserRow = (row: any): AuthUser => ({
  id: row.id,
  email: row.email,
  rol: row.rol,
  nombre: row.nombre,
  entrenadorId: row.entrenador_id ?? null,
  debeCambiarPassword: row.debe_cambiar_password,
});

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    const userResult = await db.query("SELECT * FROM users WHERE id = $1 AND activo = true LIMIT 1", [decoded.id]);

    if (!userResult.rowCount) {
      return res.status(401).json({ message: "Usuario no válido" });
    }

    const user = mapUserRow(userResult.rows[0]);

    req.user = user;

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

export const requireRole = (roles: Role | Role[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ message: "No tienes permisos para esta acción" });
    }

    return next();
  };
};

export const requirePasswordChangeResolved = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const isAllowedPasswordRoute = req.path === "/me" || req.path === "/change-password";

  if (req.user.debeCambiarPassword && !isAllowedPasswordRoute) {
    return res.status(403).json({
      statusCode: 403,
      error: "Forbidden",
      message: "Debes cambiar tu contraseña en tu primer inicio de sesión antes de realizar operaciones en el sistema.",
      code: "MUST_CHANGE_PASSWORD",
    });
  }

  return next();
};
