import { randomInt } from 'node:crypto'

const DICE_EXPR = /^\s*(?:(\d+)\s*[dD])?(\d+)\s*(?:([+-])\s*(\d+))?\s*$/

export function roll(faces) {
  if (!Number.isInteger(faces) || faces < 1) {
    throw new RangeError('Faces must be >= 1.')
  }
  return randomInt(1, faces + 1)
}

// Accepts 'd6', '2d8+3', '3d6', or a plain integer.
export function parseAndRollDetail(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new TypeError('Expression must not be empty.')
  }
  const match = DICE_EXPR.exec(expression)
  if (!match) {
    throw new SyntaxError(
      "Invalid dice expression. Use formats like 'd6', '1d6', '2d6+3', '3d8-1', or a plain integer.",
    )
  }

  const count = match[1] ? Number(match[1]) : 1
  const faces = Number(match[2])
  let modifier = match[4] ? Number(match[4]) : 0
  if (match[3] === '-') modifier = -modifier

  if (count < 1) throw new RangeError('Die count must be >= 1.')
  if (count > 1000) throw new RangeError('Die count must be <= 1000.')
  if (faces < 1) throw new RangeError('Faces must be >= 1.')

  const rolls = Array.from({ length: count }, () => roll(faces))
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier
  return { rolls, total }
}

export function parseAndRoll(expression) {
  return parseAndRollDetail(expression).total
}
