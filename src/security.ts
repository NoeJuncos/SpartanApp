import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "spartan-dev-secret";

export const hashPassword = async (plainPassword: string) => bcrypt.hash(plainPassword, 10);
export const comparePassword = async (plainPassword: string, hash: string) => bcrypt.compare(plainPassword, hash);

export const signToken = (user: AuthUser) =>
  jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string) =>
  jwt.verify(token, JWT_SECRET) as AuthUser;
