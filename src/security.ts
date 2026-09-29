import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido. Configuralo en las variables de entorno.");
}

export const hashPassword = async (plainPassword: string) => bcrypt.hash(plainPassword, 10);
export const comparePassword = async (plainPassword: string, hash: string) => bcrypt.compare(plainPassword, hash);

export const signToken = (user: AuthUser) =>
  jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string) =>
  jwt.verify(token, JWT_SECRET) as AuthUser;
