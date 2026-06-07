/**
 * Log-normal PDF for price given spot S0 and log-return params (mu, sigma).
 * If R = ln(S/S0) ~ N(mu, sigma^2), then S = S0 * exp(R).
 * @param {number} price
 * @param {number} spotUsd
 * @param {number} mu
 * @param {number} sigma
 * @returns {number}
 */
export function logNormalPriceDensity(price, spotUsd, mu, sigma) {
  if (price <= 0 || spotUsd <= 0 || sigma <= 0) return 0;
  const logReturn = Math.log(price / spotUsd);
  const z = (logReturn - mu) / sigma;
  const normalPdf = Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  return normalPdf / price;
}

/**
 * @param {number} spotUsd
 * @param {number} mu
 * @param {number} sigma
 * @param {{ gridPoints?: number, sigmaSpan?: number }} [opts]
 * @returns {import("../forecastTypes.js").PdfPoint[]}
 */
export function buildLogNormalPdfGrid(spotUsd, mu, sigma, opts = {}) {
  const gridPoints = opts.gridPoints ?? 200;
  const sigmaSpan = opts.sigmaSpan ?? 4;
  const lo = spotUsd * Math.exp(mu - sigmaSpan * sigma);
  const hi = spotUsd * Math.exp(mu + sigmaSpan * sigma);
  const step = (hi - lo) / (gridPoints - 1);
  /** @type {import("../forecastTypes.js").PdfPoint[]} */
  const pdf = [];
  for (let i = 0; i < gridPoints; i++) {
    const price = lo + i * step;
    pdf.push({ price, density: logNormalPriceDensity(price, spotUsd, mu, sigma) });
  }
  return pdf;
}

/**
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {number}
 */
export function integratePdf(pdf) {
  if (pdf.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < pdf.length; i++) {
    const dx = pdf[i].price - pdf[i - 1].price;
    area += 0.5 * (pdf[i].density + pdf[i - 1].density) * dx;
  }
  return area;
}

/**
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {import("../forecastTypes.js").PdfPoint[]}
 */
export function normalizePdf(pdf) {
  const area = integratePdf(pdf);
  if (area <= 0) return pdf;
  return pdf.map((p) => ({ price: p.price, density: p.density / area }));
}

/**
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @param {number} spotUsd
 * @returns {{ median: number, mean: number, p10: number, p90: number, probUp: number, probDown5Pct: number }}
 */
export function summarizePdf(pdf, spotUsd) {
  const normalized = normalizePdf(pdf);
  let cum = 0;
  let median = normalized[normalized.length - 1].price;
  let p10 = normalized[0].price;
  let p90 = normalized[normalized.length - 1].price;
  let mean = 0;
  let probUp = 0;
  let probDown5Pct = 0;
  const threshold95 = spotUsd * 0.95;

  for (let i = 1; i < normalized.length; i++) {
    const dx = normalized[i].price - normalized[i - 1].price;
    const slice = 0.5 * (normalized[i].density + normalized[i - 1].density) * dx;
    const midPrice = 0.5 * (normalized[i].price + normalized[i - 1].price);
    mean += midPrice * slice;
    const prevCum = cum;
    cum += slice;
    if (prevCum < 0.5 && cum >= 0.5) median = normalized[i].price;
    if (prevCum < 0.1 && cum >= 0.1) p10 = normalized[i].price;
    if (prevCum < 0.9 && cum >= 0.9) p90 = normalized[i].price;
  }

  cum = 0;
  for (let i = 1; i < normalized.length; i++) {
    const dx = normalized[i].price - normalized[i - 1].price;
    const slice = 0.5 * (normalized[i].density + normalized[i - 1].density) * dx;
    const prevCum = cum;
    cum += slice;
    if (normalized[i].price > spotUsd && prevCum < probUp + slice) {
      probUp += slice;
    }
    if (normalized[i].price < threshold95) {
      probDown5Pct += slice;
    }
  }

  probUp = Math.min(1, Math.max(0, probUp));
  probDown5Pct = Math.min(1, Math.max(0, probDown5Pct));

  return { median, mean, p10, p90, probUp, probDown5Pct };
}
