import { Pool, type QueryResultRow } from "pg";

const globalPool = globalThis as typeof globalThis & { walletgraphPool?: Pool };
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalPool.walletgraphPool) {
    globalPool.walletgraphPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
  }
  return globalPool.walletgraphPool;
}
export async function rows<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db().query<T>(sql, params)).rows;
}
export async function one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await rows<T>(sql, params))[0] ?? null;
}
