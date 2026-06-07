import coefficients from "./coefficients.json" with { type: "json" };
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
  // FOMC week widens σ via gammaFomc; mixture reserved for stress signals only.
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

  const zRisk = zScore(features.rSpy1d, stats.rSpy1d.mean, stats.rSpy1d.std);
  const fgCentered = (features.fearGreed ?? 50) - 50;
  const zFg = zScore(fgCentered, stats.fearGreedCentered.mean, stats.fearGreedCentered.std);

  // Weekly BTC momentum: scale to horizon (avoid treating 7d return as 1d expected move).
  const momInput =
    horizonKey === "24h" ? features.rBtc7d / 7 : features.rBtc7d;
  const momStd =
    horizonKey === "24h" ? stats.rBtc7d.std / 7 : stats.rBtc7d.std;
  const zMom = zScore(momInput, 0, momStd);

  const fomcMu =
    features.isFomcWeek ? h.betaFomcMu * fedStanceSign(features.fedStance) : 0;

  let mu =
    h.beta0 +
    h.betaMom * zMom +
    h.betaRisk * zRisk +
    h.betaFg * zFg +
    fomcMu;

  if (typeof h.muShrinkage === "number" && h.muShrinkage > 0 && h.muShrinkage < 1) {
    mu *= h.muShrinkage;
  }
  if (typeof h.maxAbsMu === "number" && h.maxAbsMu > 0) {
    mu = Math.max(-h.maxAbsMu, Math.min(h.maxAbsMu, mu));
  }

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
  const zRisk = zScore(features.rSpy1d, stats.rSpy1d.mean, stats.rSpy1d.std);
  const fgCentered = (features.fearGreed ?? 50) - 50;
  const zFg = zScore(fgCentered, stats.fearGreedCentered.mean, stats.fearGreedCentered.std);
  const momInput = features.rBtc7d / 7;
  const zMom = zScore(momInput, 0, stats.rBtc7d.std / 7);
  const fomcMu =
    features.isFomcWeek ? h.betaFomcMu * fedStanceSign(features.fedStance) : 0;
  let mu =
    h.beta0 + h.betaMom * zMom + h.betaRisk * zRisk + h.betaFg * zFg + fomcMu;
  if (typeof h.muShrinkage === "number" && h.muShrinkage > 0 && h.muShrinkage < 1) {
    mu *= h.muShrinkage;
  }
  if (typeof h.maxAbsMu === "number" && h.maxAbsMu > 0) {
    mu = Math.max(-h.maxAbsMu, Math.min(h.maxAbsMu, mu));
  }
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
