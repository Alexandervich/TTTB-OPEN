export function calculateModifier(value) {
  if (value <= 3) return -3
  if (value <= 5) return -2
  if (value <= 8) return -1
  if (value <= 12) return 0
  if (value <= 15) return 1
  if (value <= 17) return 2
  return 3
}

export function createStat(value) {
  return { baseValue: value, modifier: calculateModifier(value) }
}
