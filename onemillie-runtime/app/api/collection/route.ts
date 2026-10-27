import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { normalizeOrder, validOrder } from "../../../lib/collection.mjs";
import catalog from "../../../data/catalog.json";

export const dynamic = "force-dynamic";
const ids = catalog.releases.map((r: any) => r.id);
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  if (!env.DB) return reply({ error: "De platenkast is tijdelijk niet bereikbaar." }, 503);
  const userId = request.headers.get("oai-authenticated-user-id");
  // Initial enrollment is enabled only during owner-private deployment.
  // The first signed-in owner is pinned permanently; later visitors never replace it.
  if (userId && (env as any).OWNER_ENROLLMENT_ENABLED === "1") {
    await env.DB.prepare("INSERT OR IGNORE INTO collection_settings (id,owner_id,order_json,revision,updated_at) VALUES ('main',?,?,0,?)")
      .bind(userId, JSON.stringify(ids), new Date().toISOString()).run();
  }
  const row = await env.DB.prepare("SELECT owner_id,order_json,revision FROM collection_settings WHERE id='main'").first<any>();
  let saved = ids;
  try { saved = row ? JSON.parse(row.order_json) : ids; } catch { /* restore valid catalog */ }
  return reply({ order: normalizeOrder(saved, ids), revision: row?.revision ?? 0, canEdit: !!userId && row?.owner_id === userId });
}

export async function PUT(request: NextRequest) {
  if (!env.DB) return reply({ error: "Opslaan is tijdelijk niet beschikbaar." }, 503);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "Ongeldige aanvraag." }, 403);
  const userId = request.headers.get("oai-authenticated-user-id");
  if (!userId) return reply({ error: "Log in als eigenaar om de kast te wijzigen." }, 401);
  const row = await env.DB.prepare("SELECT owner_id,revision FROM collection_settings WHERE id='main'").first<any>();
  if (!row || row.owner_id !== userId) return reply({ error: "Alleen de eigenaar kan de startvolgorde wijzigen." }, 403);
  let body: any;
  try { body = await request.json(); } catch { return reply({ error: "Ongeldige gegevens." }, 400); }
  if (!validOrder(body.order, ids) || !Number.isInteger(body.revision)) return reply({ error: "De volgorde is niet compleet." }, 400);
  const result = await env.DB.prepare("UPDATE collection_settings SET order_json=?,revision=revision+1,updated_at=? WHERE id='main' AND revision=?")
    .bind(JSON.stringify(body.order), new Date().toISOString(), body.revision).run();
  if (!result.meta.changes) return reply({ error: "De kast is intussen ergens anders aangepast. Herlaad de pagina en probeer opnieuw." }, 409);
  return reply({ order: body.order, revision: body.revision + 1, canEdit: true });
}
