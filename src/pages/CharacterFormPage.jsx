import { useEffect, useState } from 'react'
import {
  clearError,
  editCharacter,
  loadCharacters,
  loadClasses,
  mustSaveChange,
  saveCharacter,
} from '../flux/characterActions.js'
import {
  selectCharacters,
  selectClasses,
  selectEditingCharacter,
  selectError,
  selectIsSaving,
  selectMustSave,
} from '../flux/characterSelectors.js'
import { dispatch, useSelector } from '../flux/store.js'
import { navigate } from '../navigation.js'
import CharacterSheet from '../sheet/CharacterSheet.jsx'

const EMPTY_FORM = {
  name: '',
  level: '1',
  className: '',
  title: '',
  alignment: '',
  str: '',
  dex: '',
  con: '',
  int: '',
  wis: '',
  cha: '',
  abilities: '',
  description: '',
  languages: '',
  literate: '',
  ld: '',
  od: '',
  sd: '',
  ft: '',
  unencumbering: '',
  equipped: '',
  inventory: '',
  notes: '',
  pct: '',
}

function toFormValues(character) {
  return Object.fromEntries(
    Object.keys(EMPTY_FORM).map((key) => [key, character?.[key] ?? EMPTY_FORM[key]]),
  )
}

function CharacterForm({ character }) {
  const classes = useSelector(selectClasses)
  const isSaving = useSelector(selectIsSaving)
  const mustSave = useSelector(selectMustSave)
  const error = useSelector(selectError)
  const [values, setValues] = useState(() => toFormValues(character))

  useEffect(() => {
    if (!mustSave) return undefined
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [mustSave])

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    if (!mustSave) dispatch(mustSaveChange(true))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    dispatch(saveCharacter({ ...values, id: character?.id }))
  }

  const handleCancel = () => {
    dispatch(mustSaveChange(false))
    navigate('/characters')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sheet-actions no-print">
        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={handleCancel}>
          Cancel
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger no-print" role="alert" style={{ maxWidth: 860, margin: '0 auto 1rem' }}>
          {error}
        </div>
      ) : null}

      <CharacterSheet values={values} onChange={handleChange} classes={classes} saved={character} />
    </form>
  )
}

export default function CharacterFormPage({ id }) {
  const characters = useSelector(selectCharacters)
  const editing = useSelector(selectEditingCharacter)

  useEffect(() => {
    dispatch(clearError())
    dispatch(loadClasses())
    dispatch(loadCharacters())
    dispatch(editCharacter(id ?? null))
    return () => dispatch(editCharacter(null))
  }, [id])

  if (id && !editing) {
    return <p>{characters.length ? 'Character not found.' : 'Loading…'}</p>
  }

  return (
    <>
      <h3 className="no-print" style={{ maxWidth: 860, margin: '0 auto 0.8rem' }}>
        {id ? 'Edit Character' : 'Create Character'}
      </h3>
      <CharacterForm key={id ?? 'new'} character={editing} />
    </>
  )
}
