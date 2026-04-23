import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hashPassword, createToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));

  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Gebruikersnaam: 3–20 tekens, alleen letters/cijfers/_" },
      { status: 400 },
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Wachtwoord moet minimaal 6 tekens zijn" },
      { status: 400 },
    );
  }

  console.log("[API /auth/register] POST username:", username);
  try {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    if (existing.rows.length > 0) {
      console.log("[API /auth/register] ❌ gebruikersnaam al in gebruik:", username);
      return NextResponse.json({ error: "Gebruikersnaam al in gebruik" }, { status: 409 });
    }

    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashPassword(password)],
    );
    const user = rows[0];
    const token = createToken({ id: user.id, username: user.username });

    console.log("[API /auth/register] ✅ aangemaakt:", user.username);
    const res = NextResponse.json({ username: user.username });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; detail?: string };
    console.error("[API /auth/register] ❌ DB fout:", e.message, "code:", e.code, "detail:", e.detail);
    return NextResponse.json({ error: "Serverfout" }, { status: 500 });
  }
}
