/**
 * WhatsApp messaging via Twilio WhatsApp API.
 * Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WA_FROM
 *
 * Setup:
 *  1. Twilio console → Messaging → Try it out → WhatsApp sandbox (dev)
 *  2. Production: request Twilio WhatsApp Business number
 *  3. Add to server/.env:
 *       TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *       TWILIO_AUTH_TOKEN=your_auth_token
 *       TWILIO_WA_FROM=whatsapp:+14155238886   (sandbox) or your number
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM        = process.env.TWILIO_WA_FROM || "whatsapp:+14155238886";

/**
 * Send a WhatsApp message via Twilio REST API (no SDK needed).
 * @param {string} to   Phone number with country code, e.g. "099123456" → normalized to +598...
 * @param {string} body Message text
 * @returns {Promise<{sent: boolean, sid?: string, error?: string}>}
 */
export async function sendWhatsApp(to, body) {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[WhatsApp] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — message not sent");
    return { sent: false, reason: "credentials_missing" };
  }

  // Normalize Uruguayan numbers: 09X XXX XXX → whatsapp:+598XXXXXXXXX
  const normalized = normalizePhone(to);
  if (!normalized) {
    console.warn("[WhatsApp] Could not normalize phone:", to);
    return { sent: false, reason: "invalid_phone" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    From: FROM,
    To: `whatsapp:${normalized}`,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64"),
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Twilio error");
    return { sent: true, sid: data.sid };
  } catch (err) {
    console.error("[WhatsApp] Send error:", err.message);
    return { sent: false, error: err.message };
  }
}

// ── Message templates ──────────────────────────────────────────

export function msgOrderConfirmed(name) {
  return `Hola ${name} 🤝\nTu pedido en RIXX ya está confirmado.\n\nEstamos preparando todo para que lo tengas lo antes posible.\n\nTe aviso por acá apenas salga el envío.`;
}

export function msgShipped(name) {
  return `${name}, tu pedido ya salió 🚚\n\nEn breve lo vas a tener en tus manos.\nCualquier cosa, te leo por acá.`;
}

export function msgDrop(name, link) {
  return `${name} 👀\n\nSe viene un drop nuevo esta semana.\n\nTenés acceso anticipado por ser cliente:\n👉 ${link}\n\n(No lo vamos a publicar todavía)`;
}

export function msgRepurchase(name, link) {
  return `${name} 🔥\n\nSi te gustaron tus RIXX, tenemos modelos nuevos que te pueden interesar.\n\n👉 ${link}`;
}

export function msgAbandonedCart(name, link) {
  return `${name} 👀\n\nTe olvidaste estos RIXX.\n\nTodavía están disponibles:\n👉 ${link}\n\n(No te duermas que vuelan)`;
}

// ── Helpers ────────────────────────────────────────────────────

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("598") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("09") && digits.length === 9) return `+598${digits.slice(1)}`;
  if (digits.length === 8) return `+598${digits}`; // local without leading 0
  return null;
}
