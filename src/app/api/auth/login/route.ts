import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifyPassword, createToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  console.log("[API /auth/login] POST username:", username ?? "(leeg)");
  if (!username || !password) {
    return NextResponse.json({ error: "Vul alle velden in" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    console.log("[API /auth/login] rows found:", rows.length);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      console.log("[API /auth/login] ❌ ongeldig wachtwoord of gebruiker niet gevonden");
      return NextResponse.json(
        { error: "Gebruikersnaam of wachtwoord onjuist" },
        { status: 401 },
      );
    }

    const token = createToken({ id: user.id, username: user.username });
    console.log("[API /auth/login] ✅ ingelogd:", user.username);
    const res = NextResponse.json({ username: user.username });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; detail?: string };
    console.error("[API /auth/login] ❌ DB fout:", e.message, "code:", e.code, "detail:", e.detail);
    return NextResponse.json({ error: "Serverfout" }, { status: 500 });
  }
}
