import coefficients from "./coefficients.json";
import { fedStanceSign } from "../macro/fomcContext.js";

/**
 * @param {number} value
 * @param {number} mean
 * @param {number} std
 * @returns {number}
 */
export function zScore(value, mean, std) {
  if (!Number.isFinite(std) || std <= 0) return 0;
  return (value - mean) / std;
}

/**
 * @param {number} sigma
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clampSigma(sigma, min, max) {
  return Math.min(max, Math.max(min, sigma));
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @returns {boolean}
 */
function isCriticalDegraded(features) {
  return features.degradedFeatures.includes("spot") || features.degradedFeatures.includes("btcDaily");
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @returns {boolean}
 */
export function shouldActivateMixture(features) {
  const mix = coefficients.mixture;
  if (features.isFomcWeek) return true;
  if (features.fearGreed != null && features.fearGreed < mix.fearGreedThreshold) return true;
  if (features.rSpy7d < mix.spy7dReturnThreshold) return true;
  if (features.expectedNextMove === "hike" && features.fedStance === "hawkish") return true;
  return false;
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @returns {number}
 */
export function computeStressWeight(features) {
  const mix = coefficients.mixture;
  let w = mix.stressWeightBase;
  if (features.isFomcWeek) w += mix.stressWeightFomc;
  if (features.expectedNextMove === "hike" && features.fedStance === "hawkish") {
    w += mix.stressWeightHawkishHike;
  }
  if (features.fearGreed != null && features.fearGreed < mix.fearGreedThreshold) w += 0.1;
  return Math.min(0.75, Math.max(0.15, w));
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @param {'24h' | '168h'} horizonKey
 * @returns {import("../forecastTypes.js").HorizonDistributionParams}
 */
export function estimateDistributionParams(features, horizonKey) {
  const stats = coefficients.zScoreStats;
  const h =
    horizonKey === "24h" ? coefficients.horizon24h : coefficients.horizon168h;

  const zMom = zScore(features.rBtc7d, stats.rBtc7d.mean, stats.rBtc7d.std);
  const zRisk = zScore(features.rSpy1d, stats.rSpy1d.mean, stats.rSpy1d.std);
  const fgCentered = (features.fearGreed ?? 50) - 50;
  const zFg = zScore(fgCentered, stats.fearGreedCentered.mean, stats.fearGreedCentered.std);

  const fomcMu =
    features.isFomcWeek ? h.betaFomcMu * fedStanceSign(features.fedStance) : 0;

  let mu =
    h.beta0 +
    h.betaMom * zMom +
    h.betaRisk * zRisk +
    h.betaFg * zFg +
    fomcMu;

  const degraded = isCriticalDegraded(features);
  const volInput = Math.max(0.05, features.volBtc30d);
  let logSigma =
    h.gamma0 +
    h.gammaVol * Math.log(volInput) +
    (features.isFomcWeek ? h.gammaFomc : 0) +
    (degraded ? h.gammaDegraded : 0);

  let sigma = clampSigma(Math.exp(logSigma), h.minSigma, h.maxSigma);

  if (horizonKey === "168h" && coefficients.horizon168h.sigmaScaleFrom24h) {
    const params24 = estimateDistributionParams24hOnly(features);
    sigma = clampSigma(
      params24.sigma * coefficients.horizon168h.sigmaScaleFrom24h,
      h.minSigma,
      h.maxSigma,
    );
    if (features.isFomcWeek) {
      sigma *= 1 + coefficients.horizon168h.fomcVolBump;
    }
  } else if (features.isFomcWeek) {
    sigma *= 1 + h.fomcVolBump;
  }

  const mixtureActive = shouldActivateMixture(features);
  if (!mixtureActive) {
    return { mu, sigma, mixtureActive: false };
  }

  const mix = coefficients.mixture;
  const stressWeight = computeStressWeight(features);
  const stressMu = mu + mix.stressMuShift;
  const stressSigma = clampSigma(sigma * mix.stressSigmaMultiplier, h.minSigma, h.maxSigma);

  return {
    mu,
    sigma,
    mixtureActive: true,
    base: { mu, sigma, weight: 1 - stressWeight },
    stress: { mu: stressMu, sigma: stressSigma, weight: stressWeight },
    stressWeight,
  };
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 */
function estimateDistributionParams24hOnly(features) {
  return estimateDistributionParamsInternal(features, coefficients.horizon24h, false);
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @param {typeof coefficients.horizon24h} h
 * @param {boolean} applyFomcBump
 */
function estimateDistributionParamsInternal(features, h, applyFomcBump) {
  const stats = coefficients.zScoreStats;
  const zMom = zScore(features.rBtc7d, stats.rBtc7d.mean, stats.rBtc7d.std);
  const zRisk = zScore(features.rSpy1d, stats.rSpy1d.mean, stats.rSpy1d.std);
  const fgCentered = (features.fearGreed ?? 50) - 50;
  const zFg = zScore(fgCentered, stats.fearGreedCentered.mean, stats.fearGreedCentered.std);
  const fomcMu =
    features.isFomcWeek ? h.betaFomcMu * fedStanceSign(features.fedStance) : 0;
  const mu =
    h.beta0 + h.betaMom * zMom + h.betaRisk * zRisk + h.betaFg * zFg + fomcMu;
  const degraded = isCriticalDegraded(features);
  const volInput = Math.max(0.05, features.volBtc30d);
  let logSigma =
    h.gamma0 +
    h.gammaVol * Math.log(volInput) +
    (features.isFomcWeek ? h.gammaFomc : 0) +
    (degraded ? h.gammaDegraded : 0);
  let sigma = clampSigma(Math.exp(logSigma), h.minSigma, h.maxSigma);
  if (applyFomcBump && features.isFomcWeek) sigma *= 1 + h.fomcVolBump;
  return { mu, sigma };
}

export { coefficients };
