import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const testDatabaseConnection = async () => {
  try {
    const result = await db.query("SELECT NOW() as now");
    return { ok: true, time: result.rows[0].now };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
};

export const closeDatabase = async () => {
  await db.end();
};
