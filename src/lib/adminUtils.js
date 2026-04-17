// Shared admin utilities — used by Stock.jsx and Admin.jsx (Ventas section)

/**
 * Format a datetime string as "DD MMM HH:MM" (es-UY locale).
 * Used for movement timestamps (stock history).
 */
export const fmtDateTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleString("es-UY", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format a date string as "DD MMM YYYY" (es-UY locale).
 * Used for order dates (no time needed).
 */
export const fmtDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("es-UY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format a number as currency (UYU, no decimals).
 * e.g. 12500 → "$12.500"
 */
export const fmtCurrency = (n) =>
  `$${Math.round(n || 0).toLocaleString("es-UY")}`;
