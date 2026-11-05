import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The designer (phase 1) stores projects in the browser, so the database is
 * optional. Creating the pool lazily keeps the app — and `next build` — working
 * in environments without `DATABASE_URL` instead of throwing at import time.
 */
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({ connectionString: databaseUrl });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

/** Lazily-created connection pool (throws only when a query actually needs it). */
export const pool: Pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const p = getPool() as unknown as Record<string | symbol, unknown>;
    const value = p[prop];
    return typeof value === "function" ? value.bind(p) : value;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_t, prop) {
    const real = drizzle(getPool()) as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
