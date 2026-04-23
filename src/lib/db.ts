import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error("[DB] ❌ DATABASE_URL is not set in Next.js API context");
    } else {
      const host = process.env.DATABASE_URL.split("@")[1]?.split("/")[0] ?? "unknown";
      console.log("[DB] Creating pool, host:", host);
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL?.includes("neon.tech") ||
        process.env.DATABASE_URL?.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : false,
    });

    pool.on("error", (err) => {
      console.error("[DB] ❌ Pool error:", err.message, err.stack);
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (duration > 2000) {
      console.warn(`[DB] ⚠️  Slow query (${duration}ms):`, text.slice(0, 80));
    }
    return res;
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; detail?: string };
    console.error("[DB] ❌ Query failed:", e.message);
    console.error("[DB]    Query:", text.slice(0, 120));
    console.error("[DB]    Code:", e.code, "| Detail:", e.detail ?? "-");
    throw err;
  }
}
