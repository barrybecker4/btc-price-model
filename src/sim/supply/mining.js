import { FIRST_HALVING_YEAR, HALVING_INTERVAL_YEARS } from "./halving.js";

/** Block reward in BTC (post–Apr 2024 halving) until FIRST_HALVING_YEAR. */
export function getDailyMining(year) {
  let reward = 3.125;
  for (let hy = FIRST_HALVING_YEAR; year >= hy; hy += HALVING_INTERVAL_YEARS) {
    reward /= 2;
  }
  return 144 * reward;
}
