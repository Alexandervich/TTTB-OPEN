import { randomUUID } from 'node:crypto'
import { createCharacter, STAT_KEYS } from './domain/character.js'
import { parseAndRoll } from './domain/diceParser.js'
import { createStat } from './domain/stat.js'
import { calculateArmourClass, rollStartingEquipment } from './domain/equipment.js'

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

const SAVES = ['death', 'magic', 'paralysis', 'breath', 'spell']

// Free-text sheet fields that have no effect on the rules calculations.
const EXTRA_KEYS = [
  'title', 'alignment', 'abilities', 'languages', 'literate', 'notes',
  'equipped', 'unencumbering', 'ld', 'od', 'sd', 'ft',
]
const EXTRA_MAX_LENGTH = 5000

function parseExtras(vm) {
  const extras = {}
  for (const key of EXTRA_KEYS) {
    const value = String(vm?.[key] ?? '')
    if (value.length > EXTRA_MAX_LENGTH) throw new ValidationError(`${key} is too long.`)
    extras[key] = value
  }
  return extras
}

// Prime requisite XP modifier table (TTTB.pdf 1.4.3).
function formatXpModifier(score) {
  if (!Number.isInteger(score)) return ''
  if (score <= 5) return '-20%'
  if (score <= 8) return '-10%'
  if (score <= 12) return '0%'
  if (score <= 15) return '+5%'
  return '+10%'
}

function toViewModel(row, items) {
  const extras = Object.fromEntries(EXTRA_KEYS.map((key) => [key, '']))
  Object.assign(extras, JSON.parse(row.extras || '{}'))
  const vm = {
    ...extras,
    id: row.id,
    name: row.name,
    level: String(row.level),
    className: row.class_name,
    hitPoints: row.hit_points,
    hitPointMax: row.hit_point_max,
    armorClass: row.armor_class,
    attackBonus: row.attack_bonus,
    inventory: items.map((item) => item.name).join('\n'),
    description: row.description,
    currentExp: String(row.current_exp),
    nextLvlExp: String(row.next_lvl_exp),
    pct: formatXpModifier(row[`${row.prime_requisite}_base`]),
    spells: JSON.parse(row.spells || '[]'),
  }
  for (const key of STAT_KEYS) {
    vm[key] = String(row[`${key}_base`])
    vm[`${key}Mod`] = String(row[`${key}_modifier`])
  }
  for (const save of SAVES) {
    vm[`${save}SavingThrow`] = String(row[`save_${save}`])
  }
  return vm
}

function parseStat(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return createStat(parseAndRoll('3d6'))
  }
  const number = Number(value)
  if (!Number.isInteger(number) || number < 3 || number > 18) {
    throw new ValidationError(`${label} must be a whole number between 3 and 18.`)
  }
  return createStat(number)
}

function parseInventory(value) {
  return String(value ?? '')
    .split(/\n|,(?![^(]*\))/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ id: randomUUID(), name, description: '', weight: 0, cost: 0, currencyType: '' }))
}

export function createRepository(db) {
  const CHARACTER_SELECT = `
    SELECT c.*, cc.name AS class_name, cc.prime_requisite, p.spells FROM character c
    JOIN character_class cc ON cc.id = c.class_id
    LEFT JOIN progression p ON p.class_id = c.class_id AND p.level = c.level`

  function loadClass(name) {
    const cls = db.prepare('SELECT * FROM character_class WHERE name = ?').get(String(name ?? ''))
    if (!cls) {
      const names = db.prepare('SELECT name FROM character_class ORDER BY name').all().map((c) => c.name)
      throw new ValidationError(`Class must be one of: ${names.join(', ')}.`)
    }
    const progressions = db
      .prepare('SELECT * FROM progression WHERE class_id = ? ORDER BY level')
      .all(cls.id)
      .map((p) => ({
        level: p.level,
        hpBonus: p.hp_bonus,
        expertise: p.expertise,
        spellsPerDay: p.spells_per_day,
        spells: JSON.parse(p.spells || '[]'),
        attackBonus: p.attack_bonus,
        experienceRequired: p.experience_required,
        savingThrows: Object.fromEntries(SAVES.map((save) => [save, p[`save_${save}`]])),
      }))
    return { id: cls.id, name: cls.name, hitDie: cls.hit_die, progressions }
  }

  function itemsFor(characterId) {
    return db.prepare('SELECT * FROM item WHERE character_id = ? ORDER BY position').all(characterId)
  }

  function persist(character) {
    const params = [
      character.id, character.name, character.level, character.classId,
      character.hitPoints, character.hitPointMax, character.armorClass,
      ...STAT_KEYS.flatMap((key) => [character[key].baseValue, character[key].modifier]),
      character.attackBonus,
      ...SAVES.map((save) => character.savingThrows[save]),
      character.expertise, character.spellsPerDay, character.description,
      character.currentExp, character.nextLvlExp, JSON.stringify(character.extras),
    ]
    db.prepare(
      `INSERT INTO character (id, name, level, class_id, hit_points, hit_point_max, armor_class,
         str_base, str_modifier, dex_base, dex_modifier, con_base, con_modifier,
         int_base, int_modifier, wis_base, wis_modifier, cha_base, cha_modifier,
         attack_bonus, save_death, save_magic, save_paralysis, save_breath, save_spell,
         expertise, spells_per_day, description, current_exp, next_lvl_exp, extras)
       VALUES (${params.map(() => '?').join(', ')})`,
    ).run(...params)

    const insertItem = db.prepare(
      `INSERT INTO item (id, character_id, position, name, description, weight, cost, currency_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    character.inventory.forEach((item, index) => {
      insertItem.run(item.id, character.id, index, item.name, item.description, item.weight, item.cost, item.currencyType)
    })
  }

  function inTransaction(work) {
    db.exec('BEGIN')
    try {
      const result = work()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      if (error?.message?.includes('UNIQUE constraint failed: character.name')) {
        throw new ConflictError('A character with this name already exists.')
      }
      throw error
    }
  }

  function build(vm, id, { rollEquipment = false } = {}) {
    const name = String(vm?.name ?? '').trim()
    if (!name) throw new ValidationError('Name is required.')
    const levelText = String(vm.level ?? '').trim()
    const level = levelText === '' ? 1 : Number(levelText)
    if (!Number.isInteger(level) || level < 1) throw new ValidationError('Level must be a positive whole number.')

    const characterClass = loadClass(vm.className)
    const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, parseStat(vm[key], key.toUpperCase())]))
    const character = createCharacter({
      id,
      name,
      level,
      characterClass,
      stats,
      description: String(vm.description ?? ''),
      inventory: parseInventory(vm.inventory),
    })
    if (rollEquipment && character.inventory.length === 0) {
      character.inventory = parseInventory(rollStartingEquipment(characterClass.name).join('\n'))
    }
    character.armorClass = calculateArmourClass(character.inventory.map((item) => item.name), character.dex.modifier)
    character.extras = parseExtras(vm)
    return character
  }

  return {
    listClasses() {
      return db.prepare('SELECT name, hit_die AS hitDie FROM character_class ORDER BY name').all()
    },

    getCharacters() {
      const rows = db.prepare(`${CHARACTER_SELECT} ORDER BY c.name COLLATE NOCASE`).all()
      return rows.map((row) => toViewModel(row, itemsFor(row.id)))
    },

    getCharacter(id) {
      const row = db.prepare(`${CHARACTER_SELECT} WHERE c.id = ?`).get(id)
      return row ? toViewModel(row, itemsFor(row.id)) : null
    },

    addCharacter(vm) {
      const character = build(vm, undefined, { rollEquipment: true })
      inTransaction(() => persist(character))
      return this.getCharacter(character.id)
    },

    updateCharacter(id, vm) {
      if (!this.getCharacter(id)) throw new NotFoundError('Character not found.')
      const character = build(vm, id)
      inTransaction(() => {
        db.prepare('DELETE FROM character WHERE id = ?').run(id)
        persist(character)
      })
      return this.getCharacter(id)
    },

    deleteCharacter(id) {
      return db.prepare('DELETE FROM character WHERE id = ?').run(id).changes > 0
    },
  }
}
