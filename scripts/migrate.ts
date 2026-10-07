import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const sql = await readFile(join(process.cwd(), "database/001_initial.sql"), "utf8");
  await pool.query(sql);
  console.log("Database schema ready");
} finally {
  await pool.end();
}
