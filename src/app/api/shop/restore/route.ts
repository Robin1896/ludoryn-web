// POST /api/shop/restore
// Synchroniseert alle actieve RevenueCat entitlements naar de database.
// Body: { unlockedIds: string[], allPro: boolean }
// De client stuurt dit na Purchases.restorePurchases() — wij slaan het op zonder
// opnieuw te verifiëren, want RevenueCat heeft de receipts al gevalideerd.
//
// OPTIONEEL: voor extra veiligheid kun je hier alsnog de RC REST API aanroepen.

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import { ALL_EXPANSION_IDS, type ExpansionId } from "@/lib/shop";

const RC_SECRET = process.env.REVENUECAT_SECRET_KEY ?? "";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "niet ingelogd" }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: "ongeldig token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "ongeldige body" }, { status: 400 });

  const { unlockedIds, allPro } = body as { unlockedIds?: string[]; allPro?: boolean };

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_expansions TEXT[] DEFAULT '{}'`);

    let finalIds: ExpansionId[];

    if (allPro) {
      // Pro Bundle: optioneel nog eens verifiëren via RC
      if (RC_SECRET) {
        const valid = await verifyProViaRC(user.username);
        if (!valid) return NextResponse.json({ error: "pro niet geverifieerd" }, { status: 402 });
      }
      finalIds = [...ALL_EXPANSION_IDS];
    } else {
      // Filter alleen geldige expansion IDs
      finalIds = (unlockedIds ?? []).filter((id): id is ExpansionId =>
        ALL_EXPANSION_IDS.includes(id as ExpansionId),
      );
    }

    await query(
      `UPDATE users SET unlocked_expansions = $1 WHERE id = $2`,
      [finalIds, user.id],
    );

    return NextResponse.json({ ok: true, unlockedIds: finalIds });
  } catch (err) {
    console.error("[shop/restore]", err);
    return NextResponse.json({ error: "server fout" }, { status: 500 });
  }
}

async function verifyProViaRC(appUserId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${RC_SECRET}` } },
    );
    if (!res.ok) return false;
    const data = await res.json();
    const entitlement = data?.subscriber?.entitlements?.["pro"];
    if (!entitlement) return false;
    const expiresDate = entitlement.expires_date;
    if (expiresDate && new Date(expiresDate) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}
