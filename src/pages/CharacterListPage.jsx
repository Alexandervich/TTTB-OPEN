import { useEffect } from 'react'
import { deleteCharacter, loadCharacters } from '../flux/characterActions.js'
import {
  selectCharacterCount,
  selectCharacters,
  selectError,
  selectIsLoading,
} from '../flux/characterSelectors.js'
import { dispatch, useSelector } from '../flux/store.js'
import { navigate } from '../navigation.js'

export default function CharacterListPage() {
  const characters = useSelector(selectCharacters)
  const count = useSelector(selectCharacterCount)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  useEffect(() => {
    dispatch(loadCharacters())
  }, [])

  const handleDelete = (character) => {
    if (window.confirm(`Delete ${character.name}?`)) {
      dispatch(deleteCharacter(character.id))
    }
  }

  return (
    <>
      <h3>Characters ({count})</h3>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {isLoading && !count ? <p>Loading…</p> : null}
      {!isLoading && !count && !error ? <p>No characters yet.</p> : null}

      {count ? (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Class</th><th>Lvl</th><th>HP</th><th>AC</th>
              <th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th>
              <th>XP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.className}</td>
                <td>{c.level}</td>
                <td>{c.hitPoints}/{c.hitPointMax}</td>
                <td>{c.armorClass}</td>
                <td>{c.str}</td><td>{c.dex}</td><td>{c.con}</td>
                <td>{c.int}</td><td>{c.wis}</td><td>{c.cha}</td>
                <td>{c.currentExp}/{c.nextLvlExp}</td>
                <td className="text-nowrap">
                  <button
                    className="btn btn-sm btn-secondary"
                    type="button"
                    onClick={() => navigate(`/character/edit/${c.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger ms-1"
                    type="button"
                    onClick={() => handleDelete(c)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <button className="btn btn-primary" type="button" onClick={() => navigate('/character/create')}>
        New Character
      </button>
    </>
  )
}
