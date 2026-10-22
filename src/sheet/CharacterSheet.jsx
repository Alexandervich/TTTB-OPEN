import { calculateModifier, formatModifier, MOVEMENT } from './rules.js'
import './sheet.css'

// Order and hints follow the printed sheet.
const ABILITIES = [
  { key: 'str', label: 'STR', hint: 'Melee att./damage, Open doors' },
  { key: 'int', label: 'INT', hint: 'Languages, Literacy' },
  { key: 'wis', label: 'WIS', hint: 'Saves vs magic' },
  { key: 'dex', label: 'DEX', hint: 'Missile attacks, AC, Initiative' },
  { key: 'con', label: 'CON', hint: 'Hit points' },
  { key: 'cha', label: 'CHA', hint: 'Reactions, #Retainers, Loyalty' },
]

const SAVING_THROWS = [
  { key: 'deathSavingThrow', label: 'D', hint: 'Doom' },
  { key: 'magicSavingThrow', label: 'R', hint: 'Ray' },
  { key: 'paralysisSavingThrow', label: 'H', hint: 'Hold' },
  { key: 'breathSavingThrow', label: 'B', hint: 'Blast' },
  { key: 'spellSavingThrow', label: 'S', hint: 'Spell' },
]

const EXPLORATION = [
  { key: 'ld', label: 'LD', hint: 'Listen at door (1-in-6 or by class)' },
  { key: 'od', label: 'OD', hint: 'Open stuck door (based on STR)' },
  { key: 'sd', label: 'SD', hint: 'Find secret door (1-in-6 or by class)' },
  { key: 'ft', label: 'FT', hint: 'Find room trap (1-in-6 or by class)' },
]

const PACKED_SLOTS = ['STR 18+', 'STR 16+', 'STR 13+', 'STR 9+', 'STR 6+', 'STR 4+']

function Title({ children, note }) {
  return (
    <h2 className="stitle">
      {children}
      {note ? <small>{note}</small> : null}
    </h2>
  )
}

function Row({ label, hint, htmlFor, className = '', children }) {
  return (
    <div className={`srow ${className}`}>
      <label className="slabel" htmlFor={htmlFor}>{label}</label>
      <div className="sbox">{children}</div>
      {hint ? <span className="shint">{hint}</span> : null}
    </div>
  )
}

function Big({ label, hint, htmlFor, children }) {
  return (
    <div className="sbig">
      <label className="slabel" htmlFor={htmlFor}>{label}</label>
      <div className="sbox">
        <span className="shint">{hint}</span>
        {children}
      </div>
    </div>
  )
}

// `values` are the editable inputs; `saved` is the server's calculated view of the character (if any).
// `manual` holds fields the user typed over; any field not in it is calculated from the rules.
export default function CharacterSheet({ values, onChange, classes, saved, manual, onManual }) {
  const text = (name, props = {}) => (
    <input id={name} name={name} type="text" value={values[name]} onChange={onChange} {...props} />
  )

  const calc = (key) => (saved ? saved[key] : '')

  // An editable field that shows the calculated value until it is overwritten; blank it and save to restore the calculation.
  const field = (id, key, computed) => (
    <input
      id={id}
      type="text"
      value={key in manual ? manual[key] : (computed ?? '')}
      onChange={(event) => onManual(key, event.target.value)}
      placeholder="—"
    />
  )

  const preview = (key) => {
    const override = manual[`${key}Mod`]
    if (override !== undefined && override !== '' && Number.isFinite(Number(override))) return Number(override)
    return calculateModifier(values[key])
  }
  const mod = (key) => formatModifier(preview(key))
  const modField = (id, key) => field(id, `${key}Mod`, mod(key))

  return (
    <div className="sheet">
      <div className="sheet-cols">
        <div className="sheet-stack">
          <Row label="PC" htmlFor="name" hint="Character name">
            {text('name', { required: true, maxLength: 100 })}
          </Row>

          <div className="sheet-two">
            <div>
              <Row label="Class" htmlFor="className" className="wide-label">
                <select id="className" name="className" value={values.className} onChange={onChange} required>
                  <option value="">Select…</option>
                  {classes.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} (d{c.hitDie})</option>
                  ))}
                </select>
              </Row>
              <Row label="Title" htmlFor="title" className="wide-label">{text('title', { maxLength: 100 })}</Row>
            </div>
            <div>
              <Row label="AL" htmlFor="alignment" hint="Alignment: Law, Neutrality, Chaos">
                {text('alignment', { maxLength: 40 })}
              </Row>
              <Row label="Level" htmlFor="level" hint="Experience level">
                <input id="level" name="level" type="number" min={1} value={values.level} onChange={onChange} />
              </Row>
            </div>
          </div>

          <div className="sheet-two">
            <div>
              <Title>Ability Scores</Title>
              {ABILITIES.map(({ key, label, hint }) => (
                <Row key={key} label={label} htmlFor={key} hint={hint} className="score">
                  <input
                    id={key}
                    name={key}
                    type="number"
                    min={3}
                    max={18}
                    value={values[key]}
                    onChange={onChange}
                    placeholder="3d6"
                  />
                  <input
                    className="smod"
                    id={`${key}ModScore`}
                    type="text"
                    aria-label={`${label} modifier`}
                    value={`${key}Mod` in manual ? manual[`${key}Mod`] : mod(key)}
                    onChange={(event) => onManual(`${key}Mod`, event.target.value)}
                  />
                </Row>
              ))}
              <p className="sheet-note"><b>Ability check:</b> Roll under or equal on 1d20. Leave a score empty to roll 3d6.</p>
            </div>

            <div>
              <Title>Saving Throws</Title>
              {SAVING_THROWS.map(({ key, label, hint }) => (
                <Row key={key} label={label} htmlFor={key} hint={hint}>{field(key, key, calc(key))}</Row>
              ))}
              <Row label="±" htmlFor="saveMod" hint="WIS modifier to saves vs magic">
                {modField('saveMod', 'wis')}
              </Row>
              <p className="sheet-note"><b>Saving throw:</b> Roll over or equal on 1d20</p>
            </div>
          </div>

          <Title>Combat</Title>
          <div className="sheet-two">
            <div>
              <Big label="HP" hint="Hit points" htmlFor="hitPoints">{field('hitPoints', 'hitPoints', calc('hitPoints'))}</Big>
              <Big label="AC" hint="Armour Class" htmlFor="armorClass">{field('armorClass', 'armorClass', calc('armorClass'))}</Big>
              <Big label="Att" hint="Attack bonus" htmlFor="attackBonus">{field('attackBonus', 'attackBonus', calc('attackBonus'))}</Big>
            </div>
            <div>
              <Row label="Max" htmlFor="hitPointMax" hint="Maximum hit points">{field('hitPointMax', 'hitPointMax', calc('hitPointMax'))}</Row>
              <Row label="±" htmlFor="conMod" hint="CON modifier to hit points">{modField('conMod', 'con')}</Row>
              <Row label="Un" htmlFor="unAc" hint="Unarmoured AC: 10 + DEX modifier">
                {field('unAc', 'unAc', preview('dex') === null ? '' : 10 + preview('dex'))}
              </Row>
              <Row label="±" htmlFor="dexAcMod" hint="DEX modifier to Armour Class">{modField('dexAcMod', 'dex')}</Row>
              <Row label="Mel" htmlFor="melMod" hint="STR modifier to melee att./damage">{modField('melMod', 'str')}</Row>
              <Row label="Mis" htmlFor="misMod" hint="DEX modifier to missile attacks">{modField('misMod', 'dex')}</Row>
            </div>
          </div>

          <Title>Abilities, Skills, Weapons</Title>
          <textarea className="sbigtext" name="abilities" aria-label="Abilities, Skills, Weapons" value={values.abilities} onChange={onChange} />
        </div>

        <div className="sheet-stack">
          <div className="sbrand">
            <strong>TTTB</strong>
            <span>CHARACTER RECORD SHEET</span>
          </div>
          <textarea className="sbigtext portrait" name="description" aria-label="Character portrait, symbol, description" value={values.description} onChange={onChange} />
          <p className="sheet-note">Character portrait, symbol, description</p>

          <Title>Encounters</Title>
          <Row label="Init" htmlFor="initMod" hint="DEX modifier to initiative (optional)">{modField('initMod', 'dex')}</Row>
          <Row label="±" htmlFor="reactMod" hint="CHA modifier to reaction rolls">{modField('reactMod', 'cha')}</Row>

          <Title>Exploration</Title>
          {EXPLORATION.map(({ key, label, hint }) => (
            <Row key={key} label={label} htmlFor={key} hint={hint}>
              {text(key, { maxLength: 4 })}
              <span className="suffix">-in-6</span>
            </Row>
          ))}

          <Title>Movement</Title>
          <p className="sheet-note">Base mv. rate = 120, unless encumbered</p>
          <Row label="Ov" htmlFor="mvOv" hint="Overland: ⅕ base mv. rate (miles/day)">{field('mvOv', 'mvOv', MOVEMENT.overland)}</Row>
          <Row label="Ex" htmlFor="mvEx" hint="Exploration: base mv. rate (feet/turn)">{field('mvEx', 'mvEx', MOVEMENT.exploration)}</Row>
          <Row label="En" htmlFor="mvEn" hint="Encounter: ⅓ base mv. rate (feet/round)">{field('mvEn', 'mvEn', MOVEMENT.encounter)}</Row>

          <Title note="By class; extra langs. if INT 13+">Languages</Title>
          <textarea className="sbigtext" style={{ minHeight: '5rem' }} name="languages" aria-label="Languages" value={values.languages} onChange={onChange} />
          <label className="sliterate">
            Literate
            <input
              type="checkbox"
              name="literate"
              checked={values.literate === 'true'}
              onChange={(event) =>
                onChange({ target: { name: 'literate', value: event.target.checked ? 'true' : '' } })
              }
            />
          </label>
        </div>
      </div>

      <p className="sheet-footer">TTTB — character record sheet, page 1</p>

      <div className="sheet-page-break">
        <div className="sheet-p2">
          <div className="sheet-stack">
            <Title>Unencumbering Items</Title>
            <textarea className="sbigtext" style={{ minHeight: '11rem' }} name="unencumbering" aria-label="Unencumbering Items" value={values.unencumbering} onChange={onChange} />
            <p className="sheet-note">Clothing, necklaces, rings, etc. Not encumbering unless carried in large numbers (referee’s judgement).</p>

            <Title>Equipped Items</Title>
            <div className="ruled">
              <textarea name="equipped" aria-label="Equipped Items" value={values.equipped} onChange={onChange} />
            </div>
            <p className="sheet-note">Anything held, actively in use, or ready to use at short notice: armour worn, shields or weapons held, sheathed weapons, items worn on the belt.</p>
          </div>

          <div className="mv-col">
            <span className="mv-head">Base<br />Mv. Rate</span>
            <span className="mv-val">120’ (40’)</span>
            <span className="mv-val">90’ (30’)</span>
            <span className="mv-val">60’ (20’)</span>
            <span className="mv-val">30’ (10’)</span>
          </div>

          <div className="sheet-stack">
            <Title>Packed Items</Title>
            <div className="ruled">
              <textarea name="inventory" aria-label="Packed Items" value={values.inventory} onChange={onChange} />
              <div className="slots" aria-hidden="true">
                {PACKED_SLOTS.map((slot) => <span key={slot}>{slot}</span>)}
              </div>
            </div>
            <p className="sheet-note">
              All other equipment, packed into sacks, backpacks, etc. One item per line. In combat,
              retrieving a packed item optionally takes one round.
            </p>
          </div>
        </div>

        <Title note="Spells, mounts, retainers, areas explored, clues">Other Notes</Title>
        <textarea className="sbigtext notes" name="notes" aria-label="Other Notes" value={values.notes} onChange={onChange} />

        <div className="sheet-xp">
          <Big label="XP" hint="Experience points" htmlFor="currentExp">{field('currentExp', 'currentExp', calc('currentExp'))}</Big>
          <div className="sheet-stack">
            <Row label="Next" htmlFor="nextLvlExp" hint="Experience points for next level">{field('nextLvlExp', 'nextLvlExp', calc('nextLvlExp'))}</Row>
            <Row label="%" htmlFor="pct" hint="Prime requisite modifier to XP">{field('pct', 'pct', calc('pct'))}</Row>
          </div>
        </div>
      </div>
    </div>
  )
}
