/**
 * Email service via Resend (https://resend.com — free tier: 3k emails/month).
 * Requires env var: RESEND_API_KEY
 *
 * Setup:
 *  1. resend.com → create account → get API key
 *  2. Verify your domain (or use onboarding@resend.dev for testing)
 *  3. Add to server/.env:
 *       RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *       FROM_EMAIL=pedidos@rixxlentes.com
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || "onboarding@resend.dev";

/**
 * Send an email via Resend REST API.
 * @param {string}   to      Recipient email
 * @param {string}   subject Email subject
 * @param {string}   html    HTML body
 * @returns {Promise<{sent: boolean, id?: string, error?: string}>}
 */
export async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — email not sent");
    return { sent: false, reason: "credentials_missing" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Resend error");
    return { sent: true, id: data.id };
  } catch (err) {
    console.error("[Email] Send error:", err.message);
    return { sent: false, error: err.message };
  }
}

// ── HTML templates ─────────────────────────────────────────────

export function buildOrderConfirmationHTML(order) {
  const fmt = (n) =>
    new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n);

  const itemRows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:8px 0;color:#e5e2e1;border-bottom:1px solid #1e1e1e">${i.name}</td>
      <td style="padding:8px 0;color:#99907c;text-align:center;border-bottom:1px solid #1e1e1e">×${i.qty}</td>
      <td style="padding:8px 0;color:#D4AF37;text-align:right;border-bottom:1px solid #1e1e1e">${fmt(i.price * i.qty)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:4px">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #1e1e1e">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#D4AF37">RIXX Lentes</p>
          <h1 style="margin:0;font-size:22px;font-weight:300;color:#e5e2e1">¡Tu pedido está confirmado!</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 24px;font-size:14px;color:#99907c;line-height:1.6">
            Hola <strong style="color:#e5e2e1">${order.user_name || "Cliente"}</strong>,<br>
            recibimos tu pedido y lo estamos procesando.
          </p>
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#D4AF37">
            Pedido #${String(order.id || "").slice(0, 8).toUpperCase()}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">${itemRows}</table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#99907c">Subtotal</td>
              <td style="padding:6px 0;font-size:13px;color:#e5e2e1;text-align:right">${fmt(order.subtotal)}</td>
            </tr>
            ${order.discount > 0 ? `<tr>
              <td style="padding:6px 0;font-size:13px;color:#D4AF37">Descuento</td>
              <td style="padding:6px 0;font-size:13px;color:#D4AF37;text-align:right">- ${fmt(order.discount)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:12px 0 0;font-size:16px;color:#e5e2e1;border-top:1px solid #1e1e1e">Total</td>
              <td style="padding:12px 0 0;font-size:18px;color:#D4AF37;text-align:right;border-top:1px solid #1e1e1e">${fmt(order.total)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center">
          <p style="margin:0;font-size:11px;color:#4a4640">RIXX Lentes · Florida, Uruguay · contacto@rixxlentes.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildDropEmailHTML(name, link) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:4px">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #1e1e1e">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#D4AF37">Acceso anticipado</p>
          <h1 style="margin:0;font-size:22px;font-weight:300;color:#e5e2e1">Solo para clientes RIXX</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 24px;font-size:14px;color:#99907c;line-height:1.6">
            Hola ${name},<br>
            se viene un drop esta semana y vos tenés acceso antes que nadie.
          </p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#D4AF37;color:#0a0a0a;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:2px">
            Ver drop exclusivo
          </a>
          <p style="margin:24px 0 0;font-size:11px;color:#4a4640">(No lo publicamos todavía.)</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center">
          <p style="margin:0;font-size:11px;color:#4a4640">RIXX Lentes · contacto@rixxlentes.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
