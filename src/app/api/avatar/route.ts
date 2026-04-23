import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

const VALID_AVATARS = [
  "warrior", "wizard", "rogue", "knight", "sorceress", "ranger",
  "barbarian", "inventor", "elf", "pirate", "paladin", "assassin",
  "firemage", "icewitcher", "trickster", "samurai", "bard",
  "necromancer", "captain", "druid",
];

// GET /api/avatar?username=... — public, returns avatar_id for any user
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ avatarId: null });

  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32)
    `);
    const { rows } = await query(
      "SELECT avatar_id FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    return NextResponse.json({ avatarId: rows[0]?.avatar_id ?? null });
  } catch {
    return NextResponse.json({ avatarId: null });
  }
}

// POST /api/avatar — auth required, sets avatar for logged-in user
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: "Ongeldig token" }, { status: 401 });

  const { avatarId } = await req.json().catch(() => ({}));
  if (!avatarId || !VALID_AVATARS.includes(avatarId)) {
    return NextResponse.json({ error: "Ongeldige avatar" }, { status: 400 });
  }

  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32)
    `);
    await query(
      "UPDATE users SET avatar_id = $1 WHERE id = $2",
      [avatarId, user.id],
    );
    return NextResponse.json({ ok: true, avatarId });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message ?? "Serverfout" }, { status: 500 });
  }
}
