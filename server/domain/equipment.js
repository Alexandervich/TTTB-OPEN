import { roll, parseAndRoll } from './diceParser.js'

// Starting equipment and armour class rules from TTTB.pdf (1.3 step 7 and 3.2).

const ADVENTURING_ITEMS = [
  ['Caltrops (bag of 20)', 'Grappling hook', 'Mirror (hand-sized, steel)'],
  ['Candles (10)', 'Horn', 'Rope (50′)'],
  ['Chalk (10 sticks)', 'Ink + quill + 5 sheets paper', 'Sack'],
  ['Chisel', 'Iron spikes (12)', 'Shovel'],
  ['Cooking pot', 'Ladder (25′ long, rope)', 'Sledgehammer'],
  ['Crowbar', 'Lantern (bullseye) + Oil (flask)', 'Small hammer'],
  ['Drill', 'Lantern (hooded) + Oil (flask)', 'Stakes (3) and mallet'],
  ['File', 'Lard', 'Tent'],
  ['Firewood (bundle)', 'Marbles (bag of 20)', 'Twine (100′ ball)'],
  ['Fishing rod and tackle', 'Mining pick', 'Wine (2 pints)'],
]

const STARTING_WEAPONS = {
  Cleric: ['Battleaxe', 'Handaxe', 'Light crossbow + 30 bolts', 'Mace', 'Maul', 'Military flail', 'Morning star', 'Short sword', 'Sling + 20 sling bullets', 'Spear', 'Sword', 'Warhammer'],
  Fighter: ['Bastard sword', 'Battleaxe', 'Crossbow (light) + 30 bolts', 'Military flail', 'Morning star', 'Polearm', 'Shortbow + 20 arrows', 'Short sword', 'Sword', 'Spear', 'War pick', 'Zweihänder'],
  'Magic-User': ['Dagger', 'Dagger', 'Dagger', 'Dagger', 'Light crossbow + 30 bolts', 'Light crossbow + 30 bolts', 'Light crossbow + 30 bolts', 'Light crossbow + 30 bolts', 'Staff', 'Staff', 'Staff', 'Staff'],
  Thief: ['3 daggers', '3 darts', 'Handaxe', 'Heavy crossbow + 30 bolts', 'Mace', 'Military flail', 'Shortbow + 20 arrows', 'Short sword', 'Spear', 'Sword', 'War hammer', 'War pick'],
}

// Index = 1d6 - 1.
const STARTING_ARMOUR = {
  Cleric: [['Chainmail', 'Large shield'], ['Chainmail', 'Small shield'], ['Padded', 'Large shield'], ['Padded', 'Small shield'], ['Scale', 'Large shield'], ['Scale', 'Small shield']],
  Fighter: [['Chainmail', 'Large shield'], ['Chainmail', 'Small shield'], ['Padded', 'Large shield'], ['Padded', 'Small shield'], ['Scale', 'Large shield'], ['Scale', 'Small shield']],
  'Magic-User': Array(6).fill([]),
  Thief: Array(6).fill(['Padded']),
}

const CLASS_ITEMS = {
  Cleric: ['Religious habit', 'Wooden holy symbol'],
  Fighter: [],
  'Magic-User': ['Ritual robes', 'Spell book (Rank 1 spells: 4 + INT modifier)'],
  Thief: ['Thieves’ tools'],
}

const ARMOUR_AC = { padded: 12, brigandine: 15, chainmail: 14, scale: 13, 'full plate': 17, plate: 16 }
const SHIELD_AC = { 'large shield': 2, 'small shield': 1 }

function rollDistinct(count, rollOne) {
  const picked = []
  while (picked.length < count) {
    const item = rollOne()
    if (!picked.includes(item)) picked.push(item)
  }
  return picked
}

export function rollStartingEquipment(className) {
  const column = () => Math.ceil(roll(6) / 2) - 1
  const adventuring = rollDistinct(4, () => ADVENTURING_ITEMS[roll(10) - 1][column()])
    const weaponTable = STARTING_WEAPONS[className] ?? []
  const weapons = weaponTable.length ? rollDistinct(2, () => weaponTable[roll(12) - 1]) : []
  const armour = (STARTING_ARMOUR[className] ?? [])[roll(6) - 1] ?? []

  return [
    'Common clothes',
    'Backpack',
    'Bedroll',
    'Preserved rations (3)',
    'Torches (3)',
    'Waterskin',
    'Tinder box',
    `Belt pouch (${parseAndRoll('3d6')}cn)`,
    ...adventuring,
    ...weapons,
    ...armour,
    ...(CLASS_ITEMS[className] ?? []),
  ]
}

// AC is the armour's AC (10 if unarmoured) plus the melee shield modifier plus the Dexterity modifier.
export function calculateArmourClass(itemNames, dexModifier) {
  const text = itemNames.map((name) => name.toLowerCase())
  const armour = Math.max(10, ...Object.entries(ARMOUR_AC)
    .filter(([name]) => text.some((item) => item.includes(name)))
    .map(([, ac]) => ac))
  const shield = Math.max(0, ...Object.entries(SHIELD_AC)
    .filter(([name]) => text.some((item) => item.includes(name)))
    .map(([, bonus]) => bonus))
  return armour + shield + dexModifier
}
