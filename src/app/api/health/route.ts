import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Imported inside the handler: the designer works without a database.
    if (!process.env.DATABASE_URL) {
      return Response.json({ ok: true, database: "not-configured" });
    }
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
