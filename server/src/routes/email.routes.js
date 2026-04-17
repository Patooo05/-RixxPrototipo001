import { Router } from "express";
import { sendEmail, buildOrderConfirmationHTML } from "../services/email.js";
import { sendWhatsApp, msgOrderConfirmed } from "../services/whatsapp.js";

const router = Router();

/**
 * POST /api/email/order-confirmation
 * Triggered by the frontend after a successful order.
 * Sends email + WhatsApp (if phone + marketing_opt_in).
 */
router.post("/order-confirmation", async (req, res) => {
  const { order } = req.body;
  if (!order?.user_email) {
    return res.status(400).json({ error: "order.user_email requerido" });
  }

  const results = {};

  // ── Email ──────────────────────────────────────────────────
  results.email = await sendEmail(
    order.user_email,
    `RIXX — Pedido confirmado #${String(order.id || "").slice(0, 8).toUpperCase()}`,
    buildOrderConfirmationHTML(order)
  );

  // ── WhatsApp (solo si tiene celular y aceptó marketing) ───
  if (order.user_phone && order.marketing_opt_in) {
    results.whatsapp = await sendWhatsApp(
      order.user_phone,
      msgOrderConfirmed(order.user_name || "Cliente")
    );
  }

  res.json(results);
});

export default router;
