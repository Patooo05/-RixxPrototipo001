/**
 * Automation cron job — runs daily.
 * Handles delayed messaging flows (drop access, re-purchase).
 *
 * Usage: called from server startup with startAutomationJobs()
 * Requires: node-cron  →  npm install node-cron  (in server/)
 */

import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp, msgDrop, msgRepurchase } from "../services/whatsapp.js";
import { sendEmail, buildDropEmailHTML } from "../services/email.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const SITE_URL = process.env.SITE_URL || "https://rixxlentes.com";

// ── Flow 3: Drop access (2–3 days after purchase) ─────────────
async function sendDropMessages() {
  const { data, error } = await supabase
    .from("orders")
    .select("user_email, user_name, phone, marketing_opt_in")
    .eq("marketing_opt_in", true)
    .gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString())
    .lte("created_at", new Date(Date.now() - 2 * 86400000).toISOString())
    .not("status", "eq", "cancelado");

  if (error) { console.error("[automation] drop query error:", error.message); return; }

  for (const order of data ?? []) {
    const link = `${SITE_URL}/productos`;
    if (order.phone) {
      await sendWhatsApp(order.phone, msgDrop(order.user_name || "Cliente", link));
    }
    if (order.user_email) {
      await sendEmail(
        order.user_email,
        "Acceso anticipado — RIXX",
        buildDropEmailHTML(order.user_name || "Cliente", link)
      );
    }
  }

  console.log(`[automation] drop messages sent to ${(data ?? []).length} customers`);
}

// ── Flow 4: Re-purchase (5–7 days after purchase) ─────────────
async function sendRepurchaseMessages() {
  const { data, error } = await supabase
    .from("orders")
    .select("user_email, user_name, phone, marketing_opt_in")
    .eq("marketing_opt_in", true)
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .lte("created_at", new Date(Date.now() - 5 * 86400000).toISOString())
    .not("status", "eq", "cancelado");

  if (error) { console.error("[automation] repurchase query error:", error.message); return; }

  for (const order of data ?? []) {
    const link = `${SITE_URL}/productos`;
    if (order.phone) {
      await sendWhatsApp(order.phone, msgRepurchase(order.user_name || "Cliente", link));
    }
  }

  console.log(`[automation] repurchase messages sent to ${(data ?? []).length} customers`);
}

// ── Scheduler ─────────────────────────────────────────────────
export async function startAutomationJobs() {
  // Dynamically import node-cron to avoid hard dependency
  let cron;
  try {
    cron = (await import("node-cron")).default;
  } catch {
    console.warn("[automation] node-cron not installed — scheduled jobs disabled.");
    console.warn("  To enable: cd server && npm install node-cron");
    return;
  }

  // Runs every day at 10:00 AM Uruguay time (UTC-3 → 13:00 UTC)
  cron.schedule("0 13 * * *", async () => {
    console.log("[automation] Running daily automation jobs...");
    await sendDropMessages();
    await sendRepurchaseMessages();
  });

  console.log("[automation] Daily jobs scheduled (10:00 AM UY)");
}
