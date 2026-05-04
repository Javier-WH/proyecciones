// =====================================================
// Block decomposition — split `total` hours into valid block sizes.
// Ported verbatim from fucntions.tsx#generateDecompositions.
// =====================================================

/**
 * Enumerate every valid way to split `total` hours into blocks, honoring
 * min/max block sizes and max number of blocks. Results are deduplicated
 * and ordered by preference (heavy penalty for 1h blocks, prefer all-valid,
 * then by distribution preference, then by low variance).
 *
 * @param {number} total
 * @param {number} maxPerDay
 * @param {number} minPerBlock
 * @param {number} maxBlocks
 * @param {boolean} distributeEquitably
 * @param {boolean} [preventSingleHourBlocks=false]
 * @returns {number[][]}
 */
export function generateDecompositions (
  total,
  maxPerDay,
  minPerBlock,
  maxBlocks,
  distributeEquitably,
  preventSingleHourBlocks = false
) {
  const absoluteMinBlockSize = preventSingleHourBlocks ? 2 : 1

  if (total < absoluteMinBlockSize) return []

  /** @type {number[][]} */
  const results = []

  /**
   * @param {number} remaining
   * @param {number[]} cur
   */
  function gen (remaining, cur) {
    if (remaining === 0) {
      results.push([...cur])
      return
    }
    if (cur.length >= maxBlocks) return
    if (remaining < absoluteMinBlockSize) return

    const maxSize = Math.min(remaining, maxPerDay)
    for (let size = maxSize; size >= absoluteMinBlockSize; size--) {
      const after = remaining - size
      if (after > 0 && after < absoluteMinBlockSize) continue
      if (after > 0 && after > maxPerDay * (maxBlocks - cur.length - 1)) continue
      cur.push(size)
      gen(after, cur)
      cur.pop()
    }
  }

  gen(total, [])

  const seen = new Set()
  const unique = results.filter((d) => {
    const key = [...d].sort((a, b) => b - a).join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  unique.sort((a, b) => {
    // 0. Severely penalize blocks of 1
    const aHasOne = a.includes(1) ? 1 : 0
    const bHasOne = b.includes(1) ? 1 : 0
    if (aHasOne !== bHasOne) return aHasOne - bHasOne

    // 1. Prefer all blocks ≥ minPerBlock
    const aAllValid = a.every((x) => x >= minPerBlock) ? 0 : 1
    const bAllValid = b.every((x) => x >= minPerBlock) ? 0 : 1
    if (aAllValid !== bAllValid) return aAllValid - bAllValid

    // 2. Distribution preference
    if (distributeEquitably) {
      if (a.length !== b.length) return b.length - a.length
    } else {
      if (a.length !== b.length) return a.length - b.length
    }

    // 3. Prefer balanced blocks (lower variance)
    const meanA = a.reduce((s, x) => s + x, 0) / a.length
    const meanB = b.reduce((s, x) => s + x, 0) / b.length
    const varA = a.reduce((s, x) => s + (x - meanA) ** 2, 0)
    const varB = b.reduce((s, x) => s + (x - meanB) ** 2, 0)
    return varA - varB
  })

  return unique
}
