import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client=await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(731043)");
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const directory=join(process.cwd(),"database");
  const files=(await readdir(directory)).filter(name=>/^\d+_.*\.sql$/.test(name)).sort();
  for(const name of files){
    const applied=await client.query("SELECT 1 FROM schema_migrations WHERE name=$1",[name]);
    if(applied.rowCount) continue;
    await client.query("BEGIN");
    try{
      await client.query(await readFile(join(directory,name),"utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)",[name]);
      await client.query("COMMIT");
      console.log(`Applied ${name}`);
    }catch(error){await client.query("ROLLBACK");throw error;}
  }
  console.log("Database schema ready");
} finally {
  await client.query("SELECT pg_advisory_unlock(731043)");
  client.release();
  await pool.end();
}
