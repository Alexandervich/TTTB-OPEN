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
import { characterApi } from '../flux/api.js'
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
  const [calculated, setCalculated] = useState(character)
  const [manual, setManual] = useState(() => ({ ...character?.manual }))
  const [isRolling, setIsRolling] = useState(false)
  const [rollError, setRollError] = useState('')

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

  const handleManual = (key, value) => {
    setManual((current) => ({ ...current, [key]: value }))
    if (!mustSave) dispatch(mustSaveChange(true))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    dispatch(
      saveCharacter({
        ...values,
        hitPoints: calculated?.hitPoints,
        hitPointMax: calculated?.hitPointMax,
        manual,
        id: character?.id,
      }),
    )
  }

  const handleRoll = async () => {
    setIsRolling(true)
    setRollError('')
    try {
      const rolled = await characterApi.rollCharacter(values)
      setValues((current) => ({
        ...current,
        ...Object.fromEntries(
          ['str', 'dex', 'con', 'int', 'wis', 'cha', 'inventory'].map((key) => [key, rolled[key]]),
        ),
      }))
      setCalculated(rolled)
      setManual({})
      dispatch(mustSaveChange(true))
    } catch (rollFailure) {
      setRollError(rollFailure.message)
    } finally {
      setIsRolling(false)
    }
  }

  const handleCancel = () => {
    dispatch(mustSaveChange(false))
    navigate('/characters')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sheet-actions no-print">
        <button className="btn btn-secondary" type="button" onClick={handleRoll} disabled={isRolling}>
          {isRolling ? 'Rolling…' : 'Roll'}
        </button>
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

      {error || rollError ? (
        <div className="alert alert-danger no-print" role="alert" style={{ maxWidth: 860, margin: '0 auto 1rem' }}>
          {rollError || error}
        </div>
      ) : null}

      <CharacterSheet values={values} onChange={handleChange} classes={classes} saved={calculated} manual={manual} onManual={handleManual} />
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
