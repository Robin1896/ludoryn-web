// GET /api/shop/unlocks
// Geeft de unlocked expansions terug voor de ingelogde user.

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ unlockedIds: [] });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ unlockedIds: [] });

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_expansions TEXT[] DEFAULT '{}'`);
    const { rows } = await query(
      "SELECT unlocked_expansions FROM users WHERE id = $1",
      [user.id],
    );
    return NextResponse.json({ unlockedIds: rows[0]?.unlocked_expansions ?? [] });
  } catch {
    return NextResponse.json({ unlockedIds: [] });
  }
}
