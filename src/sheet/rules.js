// Mirrors server/domain/stat.js so the sheet can preview modifiers while typing.
export function calculateModifier(value) {
  const score = Number(value)
  if (String(value).trim() === '' || !Number.isInteger(score)) return null
  if (score <= 3) return -3
  if (score <= 5) return -2
  if (score <= 8) return -1
  if (score <= 12) return 0
  if (score <= 15) return 1
  if (score <= 17) return 2
  return 3
}

export function formatModifier(modifier) {
  if (modifier === null || modifier === undefined || modifier === '') return ''
  const number = Number(modifier)
  return number > 0 ? `+${number}` : String(number)
}

// Base movement is 120' per turn; overland is 1/5, encounter is 1/3 (see the sheet footnotes).
export const MOVEMENT = { overland: 24, exploration: 120, encounter: 40 }
