import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json(null);
  const user = verifyToken(token);
  if (!user) return NextResponse.json(null);

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_expansions TEXT[] DEFAULT '{}'`);
    const { rows } = await query(
      "SELECT avatar_id, unlocked_expansions FROM users WHERE id = $1",
      [user.id],
    );
    return NextResponse.json({
      username: user.username,
      avatarId: rows[0]?.avatar_id ?? null,
      unlockedExpansions: rows[0]?.unlocked_expansions ?? [],
    });
  } catch {
    return NextResponse.json({ username: user.username, avatarId: null, unlockedExpansions: [] });
  }
}
