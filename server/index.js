import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app  = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ── Validate API key at startup ───────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your_api_key_here") {
  console.error("\n  ❌  ANTHROPIC_API_KEY no configurada.");
  console.error("  Abrí server/.env y pegá tu clave de https://console.anthropic.com\n");
  process.exit(1);
}

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── Health check ─────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "RIXX AI Backend running" }));

// ── POST /api/ai-system ──────────────────────────────────────────
app.post("/api/ai-system", async (req, res) => {
  try {
    const { products = [], revenue = 0, costs = 0, adsSpend = 0 } = req.body;

    if (!products.length) {
      return res.status(400).json({ error: "No product data received" });
    }

    const profit      = revenue - costs - adsSpend;
    const margin      = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
    const lowStock    = products.filter((p) => p.stock > 0 && p.stock <= 2);
    const outOfStock  = products.filter((p) => p.stock === 0);
    const categories  = [...new Set(products.map((p) => p.category))];
    const topProducts = [...products]
      .sort((a, b) => b.price - a.price)
      .slice(0, 3)
      .map((p) => ({ name: p.name, price: p.price, stock: p.stock, category: p.category }));

    const businessSnapshot = {
      totalProducts:   products.length,
      totalRevenue:    revenue,
      totalCosts:      costs,
      adsSpend,
      grossProfit:     profit,
      marginPercent:   margin,
      outOfStockCount: outOfStock.length,
      lowStockCount:   lowStock.length,
      categories,
      topProducts,
      lowStockItems:  lowStock.map((p) => ({ name: p.name, stock: p.stock, category: p.category })),
      outOfStockItems: outOfStock.map((p) => ({ name: p.name, category: p.category })),
    };

    const prompt = `You are a senior business analyst reviewing data for RIXX, a premium sunglasses e-commerce brand.

BUSINESS DATA:
${JSON.stringify(businessSnapshot, null, 2)}

Analyze this data from three expert perspectives and return ONLY a valid JSON object — no markdown, no explanation, just JSON.

JSON schema:
{
  "finance": {
    "revenue": number,
    "costs": number,
    "profit": number,
    "margin": string,
    "recommendation": string
  },
  "operations": {
    "lowStock": [{ "name": string, "stock": number, "urgency": "critical"|"warning" }],
    "alerts": [string]
  },
  "growth": {
    "opportunities": [string]
  },
  "decisions": [
    { "type": "finance"|"operations"|"growth"|"risk", "message": string }
  ]
}

Rules:
- Never invent data not present in the snapshot
- Be conservative and specific — no generic advice
- Detect real risks from the numbers
- Limit decisions array to the 4 most impactful items
- Write in Spanish (es-UY)
- Return ONLY the JSON, nothing else`;

    console.log("[AI] Calling Claude claude-opus-4-6 with adaptive thinking...");

    const message = await client.messages.create({
      model:      "claude-opus-4-6",
      max_tokens: 2048,
      messages:   [{ role: "user", content: prompt }],
    });

    // Extract text block (skip thinking blocks)
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("No text response from Claude");

    let insights;
    try {
      // Strip any accidental markdown fences
      const raw = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(raw);
    } catch {
      throw new Error("Claude returned invalid JSON: " + textBlock.text.slice(0, 200));
    }

    console.log("[AI] Analysis complete. Tokens used:", message.usage);
    res.json({ success: true, insights });

  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: "Invalid Anthropic API key. Check your .env file." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Rate limited. Try again in a moment." });
    }
    console.error("[AI] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  RIXX AI Backend   →  http://localhost:${PORT}`);
  console.log(`  API endpoint      →  POST /api/ai-system\n`);
});
