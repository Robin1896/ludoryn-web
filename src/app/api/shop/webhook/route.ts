// POST /api/shop/webhook
// RevenueCat webhook — ontvangt purchase events en unlocked in de database.
// Configureer in RevenueCat dashboard: Project → Integrations → Webhooks
// Stel de "Authorization" header in op REVENUECAT_WEBHOOK_SECRET.
//
// Events die we verwerken: INITIAL_PURCHASE, NON_RENEWING_PURCHASE

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ALL_EXPANSION_IDS, type ExpansionId } from "@/lib/shop";

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  // Verificeer webhook secret
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const { event } = body;
  if (!event) return NextResponse.json({ ok: true }); // negeer onbekende events

  const eventType: string = event.type ?? "";
  const appUserId: string = event.app_user_id ?? "";
  const productId: string = event.product_id ?? "";

  // Alleen aankopen verwerken
  if (!["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE"].includes(eventType)) {
    return NextResponse.json({ ok: true });
  }

  if (!appUserId || !productId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_expansions TEXT[] DEFAULT '{}'`);

    // Zoek user op username (= app_user_id die we bij initPurchases meegeven)
    const { rows: userRows } = await query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
      [appUserId],
    );
    if (!userRows.length) {
      console.warn("[shop/webhook] User niet gevonden:", appUserId);
      return NextResponse.json({ ok: true });
    }
    const userId = userRows[0].id;

    if (productId === "nl.ludoryn.bundle.pro") {
      // Pro Bundle: unlock alles
      await query(
        `UPDATE users SET unlocked_expansions = $1 WHERE id = $2`,
        [ALL_EXPANSION_IDS, userId],
      );
      console.log(`[shop/webhook] Pro Bundle ontgrendeld voor ${appUserId}`);
    } else if (productId.startsWith("nl.ludoryn.expansion.")) {
      // Losse expansion
      const expansionId = productId.replace("nl.ludoryn.expansion.", "") as ExpansionId;
      if (!ALL_EXPANSION_IDS.includes(expansionId)) {
        console.warn("[shop/webhook] Onbekend product:", productId);
        return NextResponse.json({ ok: true });
      }
      await query(
        `UPDATE users
         SET unlocked_expansions = array_append(
           array_remove(COALESCE(unlocked_expansions, '{}'), $1::text),
           $1::text
         )
         WHERE id = $2`,
        [expansionId, userId],
      );
      console.log(`[shop/webhook] ${expansionId} ontgrendeld voor ${appUserId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[shop/webhook]", err);
    return NextResponse.json({ error: "server fout" }, { status: 500 });
  }
}
