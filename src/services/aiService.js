/**
 * Local AI analysis engine — analiza los datos reales del negocio
 * y genera insights estructurados sin necesidad de backend.
 */

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function analyzeFinance({ revenue, costs, adsSpend }) {
  const profit = revenue - costs - adsSpend;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
  const marginNum = parseFloat(margin);

  let recommendation;
  if (marginNum >= 55) {
    recommendation =
      "Margen excepcional. Momento ideal para reinvertir en marketing de marca y expansión de colección.";
  } else if (marginNum >= 40) {
    recommendation =
      "Margen saludable. Evaluá incrementar el precio de los modelos premium entre un 8–12% sin perder competitividad.";
  } else if (marginNum >= 25) {
    recommendation =
      "Margen moderado. Revisá los costos de los productos con menor rotación y considerá descontinuarlos.";
  } else {
    recommendation =
      "Margen bajo. Prioridad: reducir costo de adquisición o incrementar precio de venta en al menos 15%.";
  }

  return { revenue, costs, profit, margin, recommendation };
}

function analyzeOperations(products) {
  const lowStock = products
    .filter((p) => p.stock > 0 && p.stock <= 3)
    .map((p) => ({
      name: p.name,
      stock: p.stock,
      urgency: p.stock === 1 ? "critical" : "warning",
    }));

  const outOfStock = products.filter((p) => p.stock === 0);
  const alerts = [];

  if (outOfStock.length > 0) {
    alerts.push(
      `${outOfStock.length} producto${outOfStock.length > 1 ? "s" : ""} agotado${outOfStock.length > 1 ? "s" : ""}: ${outOfStock.map((p) => p.name).join(", ")}.`
    );
  }

  if (lowStock.length > 0) {
    const critical = lowStock.filter((p) => p.urgency === "critical");
    if (critical.length > 0) {
      alerts.push(
        `Stock crítico (1 unidad) en: ${critical.map((p) => p.name).join(", ")}. Reabastecer esta semana.`
      );
    }
  }

  const discounted = products.filter(
    (p) => p.descuento?.porcentaje && new Date(p.descuento.hasta) > new Date()
  );
  if (discounted.length > 0) {
    alerts.push(
      `${discounted.length} producto${discounted.length > 1 ? "s" : ""} con descuento activo. Verificá que el margen no baje del 30%.`
    );
  }

  if (alerts.length === 0) {
    alerts.push("Inventario en buen estado. Sin alertas operativas críticas.");
  }

  return { lowStock, alerts };
}

function analyzeGrowth(products, metrics) {
  const opportunities = [];
  const { margin, revenue, costs } = metrics;
  const marginNum = parseFloat(margin);

  // Categorías con oportunidad
  const byCategory = {};
  products.forEach((p) => {
    byCategory[p.category] = byCategory[p.category] || [];
    byCategory[p.category].push(p);
  });
  const categories = Object.entries(byCategory);

  const biggestCat = categories.sort((a, b) => b[1].length - a[1].length)[0];
  if (biggestCat) {
    opportunities.push(
      `La categoría "${biggestCat[0]}" concentra la mayor cantidad de SKUs. Evaluá una campaña específica para esa línea en Instagram y TikTok.`
    );
  }

  // Productos sin stock = demanda no capturada
  const outOfStock = products.filter((p) => p.stock === 0);
  if (outOfStock.length > 0) {
    opportunities.push(
      `Reposición urgente de ${outOfStock.map((p) => p.name).join(", ")}: cada día agotado es ingreso perdido.`
    );
  }

  // Envío gratis como palanca
  opportunities.push(
    "La promoción '2 pares = envío gratis' puede aumentar el ticket promedio. Destacá esto en el banner principal."
  );

  // Margen y pricing
  if (marginNum < 50) {
    opportunities.push(
      "Introducir un modelo 'edición limitada' a precio premium (30–40% sobre el precio actual) puede elevar el margen sin cambiar la estructura de costos."
    );
  } else {
    opportunities.push(
      "Con márgenes sólidos, es buen momento para lanzar un programa de fidelización o bundle 2x1 en modelos de menor rotación."
    );
  }

  // Productos destacados
  const featured = products.filter((p) => p.featured);
  if (featured.length < 3) {
    opportunities.push(
      "Tenés pocos productos destacados en la home. Marcá entre 3–4 para maximizar la conversión de visitantes nuevos."
    );
  }

  return { opportunities: opportunities.slice(0, 4) };
}

function buildDecisions(products, metrics, finance, operations) {
  const decisions = [];
  const marginNum = parseFloat(metrics.margin);
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStockCritical = operations.lowStock.filter((p) => p.urgency === "critical");

  if (outOfStock.length > 0) {
    decisions.push({
      type: "operations",
      message: `Reabastecer inmediatamente: ${outOfStock.map((p) => p.name).join(", ")}. Cada día sin stock equivale a ventas perdidas directas.`,
    });
  }

  if (lowStockCritical.length > 0) {
    decisions.push({
      type: "risk",
      message: `Stock crítico en ${lowStockCritical.map((p) => p.name).join(", ")}. Si no se reabastece esta semana, pasará a agotado.`,
    });
  }

  if (marginNum >= 45) {
    decisions.push({
      type: "finance",
      message: `Margen bruto del ${metrics.margin}% — destinar al menos un 10% del ingreso a publicidad pagada en Meta/TikTok para escalar ventas.`,
    });
  } else {
    decisions.push({
      type: "finance",
      message: `Margen del ${metrics.margin}% por debajo del objetivo (50%). Revisá el precio de costo de los productos con menor margen.`,
    });
  }

  decisions.push({
    type: "growth",
    message:
      "Activar reseñas de clientes y UGC (fotos reales con el producto) en redes sociales: es el canal de adquisición más rentable para marcas de lentes premium.",
  });

  return decisions.slice(0, 4);
}

/**
 * Análisis de negocio local — no requiere backend ni API key.
 * @param {{ products: Array, revenue: number, costs: number, adsSpend: number }} data
 * @returns {Promise<{ finance, operations, growth, decisions }>}
 */
export async function runAISystem(data) {
  const { products = [], revenue = 0, costs = 0, adsSpend = 0 } = data;

  if (!products.length) throw new Error("No hay productos para analizar.");

  await delay(800);

  const metrics = { revenue, costs, adsSpend, margin: revenue > 0 ? (((revenue - costs - adsSpend) / revenue) * 100).toFixed(1) : "0.0" };

  const finance    = analyzeFinance(metrics);
  const operations = analyzeOperations(products);
  const growth     = analyzeGrowth(products, metrics);
  const decisions  = buildDecisions(products, metrics, finance, operations);

  return { finance, operations, growth, decisions };
}
