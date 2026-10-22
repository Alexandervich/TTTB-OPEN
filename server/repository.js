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

// Sheet fields the user may type over. Numbers are [min, max]; null means free text.
const MANUAL_FIELDS = {
  hitPoints: [-999, 99999], hitPointMax: [0, 99999], armorClass: [-20, 99], attackBonus: [-20, 50],
  deathSavingThrow: [0, 99], magicSavingThrow: [0, 99], paralysisSavingThrow: [0, 99],
  breathSavingThrow: [0, 99], spellSavingThrow: [0, 99],
  currentExp: [0, 1e9], nextLvlExp: [0, 1e9],
  ...Object.fromEntries(STAT_KEYS.map((key) => [`${key}Mod`, [-20, 20]])),
  unAc: null, pct: null, mvOv: null, mvEx: null, mvEn: null,
}

// Blank entries mean "use the calculated value" and are dropped.
function parseManual(vm) {
  const manual = {}
  for (const [key, range] of Object.entries(MANUAL_FIELDS)) {
    const raw = vm?.manual?.[key]
    if (raw === undefined || raw === null || String(raw).trim() === '') continue
    const text = String(raw).trim()
    if (!range) {
      if (text.length > 20) throw new ValidationError(`${key} is too long.`)
      manual[key] = text
      continue
    }
    const number = Number(text)
    if (!Number.isInteger(number) || number < range[0] || number > range[1]) {
      throw new ValidationError(`${key} must be a whole number between ${range[0]} and ${range[1]}.`)
    }
    manual[key] = number
  }
  return manual
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
    pct: extras.manual?.pct ?? formatXpModifier(row[`${row.prime_requisite}_base`]),
    manual: extras.manual ?? {},
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

function parseStat(value, label, { roll = false } = {}) {
  if (roll) return createStat(parseAndRoll('3d6'))
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new ValidationError(`${label} is not set. Roll the character first.`)
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

  function build(vm, id, { roll = false } = {}) {
    const name = String(vm?.name ?? '').trim() || (roll ? 'Unnamed' : '')
    if (!name) throw new ValidationError('Name is required.')
    const levelText = String(vm.level ?? '').trim()
    const level = levelText === '' ? 1 : Number(levelText)
    if (!Number.isInteger(level) || level < 1) throw new ValidationError('Level must be a positive whole number.')

    const characterClass = loadClass(vm.className)
    const manual = roll ? {} : parseManual(vm)
    const stats = Object.fromEntries(STAT_KEYS.map((key) => {
      const stat = parseStat(vm[key], key.toUpperCase(), { roll })
      if (`${key}Mod` in manual) stat.modifier = manual[`${key}Mod`]
      return [key, stat]
    }))
    const character = createCharacter({
      id,
      name,
      level,
      characterClass,
      stats,
      description: String(vm.description ?? ''),
      inventory: parseInventory(vm.inventory),
    })
    if (roll) {
      character.inventory = parseInventory(rollStartingEquipment(characterClass.name).join('\n'))
    } else {
      // Keep the hit points that were rolled earlier instead of rolling them again on save.
      const max = Number(vm.hitPointMax)
      if (Number.isInteger(max) && max > 0) {
        const current = Number(vm.hitPoints)
        character.hitPointMax = max
        character.hitPoints = Number.isInteger(current) && current >= 0 ? current : max
      }
    }
    character.armorClass = calculateArmourClass(character.inventory.map((item) => item.name), character.dex.modifier)
    for (const key of ['hitPoints', 'hitPointMax', 'armorClass', 'attackBonus', 'currentExp', 'nextLvlExp']) {
      if (key in manual) character[key] = manual[key]
    }
    for (const save of SAVES) {
      if (`${save}SavingThrow` in manual) character.savingThrows[save] = manual[`${save}SavingThrow`]
    }
    character.extras = { ...parseExtras(vm), manual }
    return character
  }

  return {
    listClasses() {
      return db.prepare('SELECT id, name, hit_die AS hitDie FROM character_class ORDER BY name').all()
    },

    getClass(id) {
      const row = db.prepare('SELECT name FROM character_class WHERE id = ?').get(String(id))
      if (!row) throw new NotFoundError('Class not found.')
      const cls = loadClass(row.name)
      const { prime_requisite: primeRequisite } = db
        .prepare('SELECT prime_requisite FROM character_class WHERE id = ?')
        .get(cls.id)
      return { ...cls, primeRequisite }
    },

    // New classes start as a copy of an existing class so every level has valid values to edit.
    createClass(body) {
      const name = String(body?.name ?? '').trim()
      if (!name) throw new ValidationError('Class name is required.')
      if (name.length > 40) throw new ValidationError('Class name is too long.')
      const source = this.getClass(body?.copyFromId)
      const id = randomUUID()
      inTransaction(() => {
        if (db.prepare('SELECT 1 FROM character_class WHERE name = ? COLLATE NOCASE').get(name)) {
          throw new ConflictError('A class with this name already exists.')
        }
        db.prepare('INSERT INTO character_class (id, name, hit_die, prime_requisite) VALUES (?, ?, ?, ?)')
          .run(id, name, source.hitDie, source.primeRequisite)
        const insert = db.prepare(
          `INSERT INTO progression (id, class_id, level, hp_bonus, expertise, spells_per_day, spells, attack_bonus,
             experience_required, save_death, save_magic, save_paralysis, save_breath, save_spell)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        for (const p of source.progressions) {
          insert.run(
            randomUUID(), id, p.level, p.hpBonus, p.expertise, p.spellsPerDay, JSON.stringify(p.spells),
            p.attackBonus, p.experienceRequired, ...SAVES.map((save) => p.savingThrows[save]),
          )
        }
      })
      return this.getClass(id)
    },

    deleteClass(id) {
      const cls = this.getClass(id)
      const { count } = db.prepare('SELECT COUNT(*) AS count FROM character WHERE class_id = ?').get(id)
      if (count > 0) {
        throw new ConflictError(`${cls.name} is used by ${count} character${count === 1 ? '' : 's'} and cannot be deleted.`)
      }
      if (db.prepare('SELECT COUNT(*) AS count FROM character_class').get().count <= 1) {
        throw new ConflictError('The last remaining class cannot be deleted.')
      }
      db.prepare('DELETE FROM character_class WHERE id = ?').run(id)
    },

    updateClass(id, body) {
      const current = this.getClass(id)
      const int = (value, label, min, max) => {
        const number = Number(value)
        if (value === '' || value === null || !Number.isInteger(number) || number < min || number > max) {
          throw new ValidationError(`${label} must be a whole number between ${min} and ${max}.`)
        }
        return number
      }
      const hitDie = int(body?.hitDie, 'Hit die', 2, 100)
      const primeRequisite = String(body?.primeRequisite ?? '').trim().toLowerCase()
      if (primeRequisite && !STAT_KEYS.includes(primeRequisite)) {
        throw new ValidationError(`Prime requisite must be one of: ${STAT_KEYS.join(', ')}.`)
      }
      const rows = Array.isArray(body?.progressions) ? body.progressions : []
      if (rows.length !== current.progressions.length) {
        throw new ValidationError('The number of levels cannot be changed.')
      }
      const parsed = current.progressions.map((existing, index) => {
        const row = rows[index] ?? {}
        const label = `Level ${existing.level}`
        const spells = Array.isArray(row.spells) ? row.spells : []
        if (spells.length > 12) throw new ValidationError(`${label}: too many spell ranks.`)
        const spellList = spells.map((n) => int(n, `${label} spells`, 0, 99))
        return {
          level: existing.level,
          hpBonus: int(row.hpBonus, `${label} HP bonus`, 0, 999),
          expertise: int(row.expertise, `${label} expertise`, 0, 100),
          attackBonus: int(row.attackBonus, `${label} attack bonus`, -20, 50),
          experienceRequired: int(row.experienceRequired, `${label} XP`, 0, 1e9),
          spells: spellList,
          saves: SAVES.map((save) => int(row.savingThrows?.[save], `${label} ${save} save`, 1, 30)),
        }
      })
      for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].experienceRequired < parsed[i - 1].experienceRequired) {
          throw new ValidationError(`Level ${parsed[i].level} XP cannot be lower than the previous level.`)
        }
      }

      inTransaction(() => {
        db.prepare('UPDATE character_class SET hit_die = ?, prime_requisite = ? WHERE id = ?').run(hitDie, primeRequisite, id)
        const update = db.prepare(
          `UPDATE progression SET hp_bonus = ?, expertise = ?, spells_per_day = ?, spells = ?, attack_bonus = ?,
             experience_required = ?, save_death = ?, save_magic = ?, save_paralysis = ?, save_breath = ?, save_spell = ?
           WHERE class_id = ? AND level = ?`,
        )
        for (const p of parsed) {
          update.run(
            p.hpBonus, p.expertise, p.spells.reduce((sum, n) => sum + n, 0), JSON.stringify(p.spells),
            p.attackBonus, p.experienceRequired, ...p.saves, id, p.level,
          )
        }
      })
      return this.getClass(id)
    },

    getCharacters() {
      const rows = db.prepare(`${CHARACTER_SELECT} ORDER BY c.name COLLATE NOCASE`).all()
      return rows.map((row) => toViewModel(row, itemsFor(row.id)))
    },

    getCharacter(id) {
      const row = db.prepare(`${CHARACTER_SELECT} WHERE c.id = ?`).get(id)
      return row ? toViewModel(row, itemsFor(row.id)) : null
    },

    // Rolls a character without saving it: persist inside a transaction that is always rolled back.
    rollCharacter(vm) {
      const character = build(vm, undefined, { roll: true })
      db.exec('BEGIN')
      try {
        db.prepare('DELETE FROM character WHERE name = ?').run(character.name)
        persist(character)
        const rolled = this.getCharacter(character.id)
        delete rolled.id
        return rolled
      } finally {
        db.exec('ROLLBACK')
      }
    },

    addCharacter(vm) {
      const character = build(vm, undefined)
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
