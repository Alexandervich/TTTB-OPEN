import { useEffect, useState } from 'react'
import { characterApi } from '../flux/api.js'

const SAVES = [
  ['death', 'Doom'],
  ['magic', 'Ray'],
  ['paralysis', 'Hold'],
  ['breath', 'Blast'],
  ['spell', 'Spell'],
]
const STATS = ['', 'str', 'dex', 'con', 'int', 'wis', 'cha']

function toDraft(cls) {
  return {
    hitDie: String(cls.hitDie),
    primeRequisite: cls.primeRequisite ?? '',
    progressions: cls.progressions.map((p) => ({
      level: p.level,
      hpBonus: String(p.hpBonus),
      expertise: String(p.expertise),
      attackBonus: String(p.attackBonus),
      experienceRequired: String(p.experienceRequired),
      spells: p.spells.join(', '),
      savingThrows: Object.fromEntries(SAVES.map(([key]) => [key, String(p.savingThrows[key])])),
    })),
  }
}

function toPayload(draft) {
  return {
    hitDie: draft.hitDie,
    primeRequisite: draft.primeRequisite,
    progressions: draft.progressions.map((p) => ({
      ...p,
      spells: p.spells.split(/[,\s]+/).filter(Boolean),
    })),
  }
}

export default function ClassEditorPage() {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [name, setName] = useState('')
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [newName, setNewName] = useState(null)

  useEffect(() => {
    characterApi
      .getClasses()
      .then((list) => {
        setClasses(list)
        if (list.length) setClassId(list[0].id)
      })
      .catch((error) => setStatus({ type: 'danger', text: error.message }))
  }, [])

  useEffect(() => {
    if (!classId) return
    characterApi
      .getClass(classId)
      .then((cls) => {
        setName(cls.name)
        setDraft(toDraft(cls))
        setDirty(false)
      })
      .catch((error) => setStatus({ type: 'danger', text: error.message }))
  }, [classId])

  const touch = (update) => {
    setDraft(update)
    setDirty(true)
    setStatus({ type: '', text: '' })
  }

  const setBase = (key, value) => touch({ ...draft, [key]: value })

  const setRow = (index, key, value) =>
    touch({
      ...draft,
      progressions: draft.progressions.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    })

  const setSave = (index, save, value) =>
    touch({
      ...draft,
      progressions: draft.progressions.map((p, i) =>
        i === index ? { ...p, savingThrows: { ...p.savingThrows, [save]: value } } : p,
      ),
    })

  const changeClass = (id) => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    setDraft(null)
    setClassId(id)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const saved = await characterApi.updateClass(classId, toPayload(draft))
      setDraft(toDraft(saved))
      setDirty(false)
      setStatus({ type: 'success', text: `${name} saved. New characters use these values.` })
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdd = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      const created = await characterApi.addClass({ name: newName, copyFromId: classId })
      const list = await characterApi.getClasses()
      setClasses(list)
      setNewName(null)
      setDraft(null)
      setClassId(created.id)
      setStatus({ type: 'success', text: `${created.name} created as a copy of ${name}. Adjust its values below.` })
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete the class ${name}? This cannot be undone.`)) return
    try {
      await characterApi.deleteClass(classId)
      const list = await characterApi.getClasses()
      setClasses(list)
      setDraft(null)
      setDirty(false)
      setClassId(list[0]?.id ?? '')
      setStatus({ type: 'success', text: `${name} deleted.` })
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    }
  }

  const handleReset = () => {
    setDraft(null)
    const id = classId
    setClassId('')
    setTimeout(() => setClassId(id), 0)
  }

  const num = (value, onChange, label, width = '4.5rem') => (
    <input
      className="form-control form-control-sm"
      style={{ width }}
      type="number"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )

  return (
    <form onSubmit={handleSave} className="class-editor">
      <h3>Class Editor</h3>

      <div className="class-editor-base">
        <label>
          Class
          <select className="form-select" value={classId} onChange={(event) => changeClass(event.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="class-editor-new">
          {newName === null ? (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!draft}
              onClick={() => {
                if (!dirty || window.confirm('Discard unsaved changes?')) setNewName('')
              }}
            >
              New Class
            </button>
          ) : (
            <>
              <input
                className="form-control"
                autoFocus
                maxLength={40}
                placeholder={`Name (copies ${name})`}
                aria-label="New class name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAdd(event)
                  if (event.key === 'Escape') setNewName(null)
                }}
              />
              <button className="btn btn-primary" type="button" onClick={handleAdd} disabled={!newName.trim()}>
                Create
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setNewName(null)}>
                Cancel
              </button>
            </>
          )}
        </div>
        {draft ? (
          <>
            <label>
              Hit die (d?)
              {num(draft.hitDie, (v) => setBase('hitDie', v), 'Hit die', '6rem')}
            </label>
            <label>
              Prime requisite
              <select
                className="form-select"
                value={draft.primeRequisite}
                onChange={(event) => setBase('primeRequisite', event.target.value)}
              >
                {STATS.map((stat) => (
                  <option key={stat} value={stat}>{stat ? stat.toUpperCase() : 'None'}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {status.text ? <div className={`alert alert-${status.type}`} role="alert">{status.text}</div> : null}

      {draft ? (
        <>
          <div className="class-editor-actions">
            <button className="btn btn-primary" type="submit" disabled={isSaving || !dirty}>
              {isSaving ? 'Saving…' : 'Save Class'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset} disabled={!dirty}>
              Discard Changes
            </button>
            <button className="btn btn-danger ms-auto" type="button" onClick={handleDelete}>
              Delete Class
            </button>
          </div>

          <div className="class-editor-table">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Lvl</th><th>XP</th><th>Att</th><th>HP bonus</th><th>Exp.</th>
                  {SAVES.map(([key, label]) => <th key={key}>{label}</th>)}
                  <th>Spells per rank</th>
                </tr>
              </thead>
              <tbody>
                {draft.progressions.map((p, i) => (
                  <tr key={p.level}>
                    <td>{p.level}</td>
                    <td>{num(p.experienceRequired, (v) => setRow(i, 'experienceRequired', v), `Level ${p.level} XP`, '7rem')}</td>
                    <td>{num(p.attackBonus, (v) => setRow(i, 'attackBonus', v), `Level ${p.level} attack`)}</td>
                    <td>{num(p.hpBonus, (v) => setRow(i, 'hpBonus', v), `Level ${p.level} HP bonus`)}</td>
                    <td>{num(p.expertise, (v) => setRow(i, 'expertise', v), `Level ${p.level} expertise`)}</td>
                    {SAVES.map(([key]) => (
                      <td key={key}>
                        {num(p.savingThrows[key], (v) => setSave(i, key, v), `Level ${p.level} ${key} save`, '4rem')}
                      </td>
                    ))}
                    <td>
                      <input
                        className="form-control form-control-sm"
                        style={{ width: '9rem' }}
                        aria-label={`Level ${p.level} spells`}
                        placeholder="e.g. 2, 1"
                        value={p.spells}
                        onChange={(event) => setRow(i, 'spells', event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-secondary">
            Spells are listed per spell rank (first number = rank 1). Changes apply to newly rolled or created
            characters; saved characters keep their stored values.
          </p>
        </>
      ) : (
        <p>Loading…</p>
      )}
    </form>
  )
}
