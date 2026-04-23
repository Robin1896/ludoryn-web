// POST /api/shop/unlock
// Verifieert een aankoop via RevenueCat en slaat de unlock op in de database.
// Body: { expansionId: string } — voor losse uitbreidingen
//       { proBundle: true }     — voor de Pro Bundle (ontgrendelt alles)

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import { ALL_EXPANSION_IDS, type ExpansionId } from "@/lib/shop";

const RC_SECRET = process.env.REVENUECAT_SECRET_KEY ?? "";

async function verifyRevenueCatEntitlement(
  appUserId: string,
  entitlementId: string,
): Promise<boolean> {
  if (!RC_SECRET) {
    console.warn("[shop/unlock] REVENUECAT_SECRET_KEY niet ingesteld — verificatie overgeslagen");
    return true; // In development: vertrouw client
  }
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${RC_SECRET}` } },
    );
    if (!res.ok) return false;
    const data = await res.json();
    const entitlement = data?.subscriber?.entitlements?.[entitlementId];
    if (!entitlement) return false;
    // Controleer of het entitlement actief is (niet verlopen)
    const expiresDate = entitlement.expires_date;
    if (expiresDate && new Date(expiresDate) < new Date()) return false;
    return true;
  } catch (err) {
    console.error("[shop/unlock] RevenueCat verificatie mislukt:", err);
    return false;
  }
}

async function ensureUnlocksColumn() {
  await query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_expansions TEXT[] DEFAULT '{}'`,
  );
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "niet ingelogd" }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: "ongeldig token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ongeldige body" }, { status: 400 });

  const { expansionId, proBundle } = body as { expansionId?: string; proBundle?: boolean };

  if (!expansionId && !proBundle) {
    return NextResponse.json({ error: "expansionId of proBundle vereist" }, { status: 400 });
  }

  try {
    await ensureUnlocksColumn();

    if (proBundle) {
      // Pro Bundle: verificeer "pro" entitlement → ontgrendel alles
      const valid = await verifyRevenueCatEntitlement(user.username, "pro");
      if (!valid) return NextResponse.json({ error: "aankoop niet geverifieerd" }, { status: 402 });

      await query(
        `UPDATE users SET unlocked_expansions = $1 WHERE id = $2`,
        [ALL_EXPANSION_IDS, user.id],
      );
      return NextResponse.json({ ok: true, unlockedIds: ALL_EXPANSION_IDS });
    }

    // Losse expansion: verificeer entitlement met dezelfde naam als expansionId
    if (!ALL_EXPANSION_IDS.includes(expansionId as ExpansionId)) {
      return NextResponse.json({ error: "onbekende expansion" }, { status: 400 });
    }
    const valid = await verifyRevenueCatEntitlement(user.username, expansionId!);
    if (!valid) return NextResponse.json({ error: "aankoop niet geverifieerd" }, { status: 402 });

    // Voeg toe aan array (vermijd duplicaten)
    await query(
      `UPDATE users
       SET unlocked_expansions = array_append(
         array_remove(COALESCE(unlocked_expansions, '{}'), $1::text),
         $1::text
       )
       WHERE id = $2`,
      [expansionId, user.id],
    );

    const { rows } = await query(
      "SELECT unlocked_expansions FROM users WHERE id = $1",
      [user.id],
    );
    return NextResponse.json({ ok: true, unlockedIds: rows[0]?.unlocked_expansions ?? [] });
  } catch (err) {
    console.error("[shop/unlock]", err);
    return NextResponse.json({ error: "server fout" }, { status: 500 });
  }
}
