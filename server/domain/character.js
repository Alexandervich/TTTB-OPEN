import { randomUUID } from 'node:crypto'
import { roll } from './diceParser.js'

export const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

// Applies the class progression for `level` to the character (port of Character.LevelCharacter).
export function levelCharacter(character, characterClass, level) {
  const maxLevel = Math.max(...characterClass.progressions.map((p) => p.level))
  const targetLevel = Math.min(Math.max(level, 1), maxLevel)
  const progression = characterClass.progressions.find((p) => p.level === targetLevel)
  const next = characterClass.progressions.find((p) => p.level === targetLevel + 1)

  // One Hit Die per level up to level 9 (with the CON modifier, min 1 HP each); the flat bonus replaces dice after that.
  let hitPointMax = progression.hpBonus
  for (let i = 0; i < Math.min(targetLevel, 9); i++) {
    hitPointMax += Math.max(1, roll(characterClass.hitDie) + character.con.modifier)
  }

  character.level = targetLevel
  character.hitPointMax = hitPointMax
  character.hitPoints = hitPointMax
  character.savingThrows = { ...progression.savingThrows }
  character.spellsPerDay = progression.spellsPerDay
  character.spells = progression.spells
  character.attackBonus = progression.attackBonus
  character.armorClass = 10 + character.dex.modifier
  character.expertise = progression.expertise
  character.currentExp = progression.experienceRequired
  character.nextLvlExp = (next ?? progression).experienceRequired
}

export function createCharacter({ id, name, level, characterClass, stats, description, inventory }) {
  const character = {
    id: id ?? randomUUID(),
    name,
    classId: characterClass.id,
    className: characterClass.name,
    description: description ?? '',
    inventory: inventory ?? [],
  }
  STAT_KEYS.forEach((key) => {
    character[key] = stats[key]
  })
  levelCharacter(character, characterClass, level)
  return character
}
