import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { CLASS_SEED } from './domain/classData.js'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS character_class (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hit_die INTEGER NOT NULL,
  prime_requisite TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS progression (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES character_class(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  hp_bonus INTEGER NOT NULL DEFAULT 0,
  expertise INTEGER NOT NULL DEFAULT 0,
  spells_per_day INTEGER NOT NULL DEFAULT 0,
  spells TEXT NOT NULL DEFAULT '[]',
  attack_bonus INTEGER NOT NULL DEFAULT 0,
  experience_required INTEGER NOT NULL DEFAULT 0,
  save_death INTEGER NOT NULL,
  save_magic INTEGER NOT NULL,
  save_paralysis INTEGER NOT NULL,
  save_breath INTEGER NOT NULL,
  save_spell INTEGER NOT NULL,
  UNIQUE (class_id, level)
);
CREATE TABLE IF NOT EXISTS character (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL,
  class_id TEXT NOT NULL REFERENCES character_class(id),
  hit_points INTEGER NOT NULL,
  hit_point_max INTEGER NOT NULL,
  armor_class INTEGER NOT NULL,
  str_base INTEGER NOT NULL, str_modifier INTEGER NOT NULL,
  dex_base INTEGER NOT NULL, dex_modifier INTEGER NOT NULL,
  con_base INTEGER NOT NULL, con_modifier INTEGER NOT NULL,
  int_base INTEGER NOT NULL, int_modifier INTEGER NOT NULL,
  wis_base INTEGER NOT NULL, wis_modifier INTEGER NOT NULL,
  cha_base INTEGER NOT NULL, cha_modifier INTEGER NOT NULL,
  attack_bonus INTEGER NOT NULL,
  save_death INTEGER NOT NULL,
  save_magic INTEGER NOT NULL,
  save_paralysis INTEGER NOT NULL,
  save_breath INTEGER NOT NULL,
  save_spell INTEGER NOT NULL,
  expertise INTEGER NOT NULL,
  spells_per_day INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  current_exp INTEGER NOT NULL,
  next_lvl_exp INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS item (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  currency_type TEXT NOT NULL DEFAULT ''
);
`

// Bump when the seeded class tables change; existing class rows are updated in place so characters keep their class.
const RULES_VERSION = 2

function seed(db) {
  const findClass = db.prepare('SELECT id FROM character_class WHERE name = ?')
  const insertClass = db.prepare('INSERT INTO character_class (id, name, hit_die, prime_requisite) VALUES (?, ?, ?, ?)')
  const updateClass = db.prepare('UPDATE character_class SET hit_die = ?, prime_requisite = ? WHERE id = ?')
  const clearProgression = db.prepare('DELETE FROM progression WHERE class_id = ?')
  const insertProgression = db.prepare(
    `INSERT INTO progression (id, class_id, level, hp_bonus, expertise, spells_per_day, spells, attack_bonus,
       experience_required, save_death, save_magic, save_paralysis, save_breath, save_spell)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  db.exec('BEGIN')
  try {
    for (const cls of CLASS_SEED) {
      const existing = findClass.get(cls.name)
      const classId = existing?.id ?? randomUUID()
      if (existing) {
        updateClass.run(cls.hitDie, cls.primeRequisite, classId)
        clearProgression.run(classId)
      } else {
        insertClass.run(classId, cls.name, cls.hitDie, cls.primeRequisite)
      }
      cls.xp.forEach((xp, index) => {
        const spells = cls.spells[index]
        insertProgression.run(
          randomUUID(), classId, index + 1, cls.hpBonus[index], cls.expertise[index],
          spells.reduce((sum, n) => sum + n, 0), JSON.stringify(spells), cls.attack[index], xp,
          ...cls.saves[index],
        )
      })
    }
    db.exec(`PRAGMA user_version = ${RULES_VERSION}`)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function openDatabase(path = process.env.TTTB_DB_PATH ?? 'server/data/tttb.db') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  const columns = db.prepare('PRAGMA table_info(character)').all().map((c) => c.name)
  if (!columns.includes('extras')) {
    db.exec("ALTER TABLE character ADD COLUMN extras TEXT NOT NULL DEFAULT '{}'")
  }
  const classColumns = db.prepare('PRAGMA table_info(character_class)').all().map((c) => c.name)
  if (!classColumns.includes('prime_requisite')) {
    db.exec("ALTER TABLE character_class ADD COLUMN prime_requisite TEXT NOT NULL DEFAULT ''")
  }
  const progressionColumns = db.prepare('PRAGMA table_info(progression)').all().map((c) => c.name)
  if (!progressionColumns.includes('spells')) {
    db.exec("ALTER TABLE progression ADD COLUMN spells TEXT NOT NULL DEFAULT '[]'")
  }
  if (db.prepare('PRAGMA user_version').get().user_version < RULES_VERSION) seed(db)
  return db
}
