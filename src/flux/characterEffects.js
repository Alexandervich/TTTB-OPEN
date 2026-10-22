import {
  CharacterActionTypes as T,
  deleteCharacterFailure,
  deleteCharacterSuccess,
  loadCharactersFailure,
  loadCharactersSuccess,
  loadClassesFailure,
  loadClassesSuccess,
  mustSaveChange,
  saveCharacterFailure,
  saveCharacterSuccess,
} from './characterActions.js'

export async function characterEffects(action, { dispatch, api, navigate }) {
  switch (action.type) {
    case T.LOAD_CHARACTERS:
      try {
        dispatch(loadCharactersSuccess(await api.getCharacters()))
      } catch (error) {
        dispatch(loadCharactersFailure(error.message))
      }
      break

    case T.LOAD_CLASSES:
      try {
        dispatch(loadClassesSuccess(await api.getClasses()))
      } catch (error) {
        dispatch(loadClassesFailure(error.message))
      }
      break

    case T.SAVE_CHARACTER:
      try {
        const saved = action.character.id
          ? await api.updateCharacter(action.character)
          : await api.addCharacter(action.character)
        dispatch(saveCharacterSuccess(saved))
        dispatch(mustSaveChange(false))
        navigate('/characters')
      } catch (error) {
        dispatch(saveCharacterFailure(error.message))
      }
      break

    case T.DELETE_CHARACTER:
      try {
        await api.deleteCharacter(action.id)
        dispatch(deleteCharacterSuccess(action.id))
      } catch (error) {
        dispatch(deleteCharacterFailure(error.message))
      }
      break
  }
}
