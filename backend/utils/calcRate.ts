/**
 * Calculate rate per liter using Fat/SNF Chart
 * 
 * @param {Object} chart - The FatSNFChart document with { entries: [{fat, snf, pricePerLiter}] }
 * @param {number} fat - Entered Fat value
 * @param {number} snf - Entered SNF value
 * @returns {number|null} price per liter or null if no entries
 */
export default function calcRate(chart: any, fat: number, snf: number): number | null {
  if (!chart || !chart.entries || chart.entries.length === 0) {
    return null;
  }

  // 1. Try to find an exact match
  const exactMatch = chart.entries.find(
    (e: any) => parseFloat(e.fat.toFixed(1)) === parseFloat(fat.toFixed(1)) && 
                parseFloat(e.snf.toFixed(1)) === parseFloat(snf.toFixed(1))
  );
  if (exactMatch) {
    return exactMatch.pricePerLiter;
  }

  // 2. Find the entry with the minimum difference in Fat, using SNF difference as the tiebreaker
  let bestEntry: any = null;
  let minFatDiff = Infinity;
  let minSnfDiff = Infinity;

  for (const entry of chart.entries) {
    const fatDiff = Math.abs(entry.fat - fat);
    const snfDiff = Math.abs(entry.snf - snf);

    // Primary: closest fat, Secondary: closest snf
    if (fatDiff < minFatDiff) {
      minFatDiff = fatDiff;
      minSnfDiff = snfDiff;
      bestEntry = entry;
    } else if (Math.abs(fatDiff - minFatDiff) < 0.01) {
      // Tie breaker on SNF
      if (snfDiff < minSnfDiff) {
        minSnfDiff = snfDiff;
        bestEntry = entry;
      }
    }
  }

  // We only return rate if the closest entry is within a reasonable tolerance (e.g. within 2.0 FAT and 2.0 SNF)
  if (bestEntry && minFatDiff <= 2.0 && minSnfDiff <= 2.0) {
    return bestEntry.pricePerLiter;
  }

  return bestEntry ? bestEntry.pricePerLiter : null;
}
