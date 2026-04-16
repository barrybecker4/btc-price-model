export function getDailyMining(year) {
  let reward = 3.125;
  if (year >= 2028) reward /= 2;
  if (year >= 2032) reward /= 2;
  if (year >= 2036) reward /= 2;
  if (year >= 2040) reward /= 2;
  return 144 * reward;
}
