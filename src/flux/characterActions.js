export const CharacterActionTypes = {
  LOAD_CHARACTERS: 'character/load',
  LOAD_CHARACTERS_SUCCESS: 'character/load/success',
  LOAD_CHARACTERS_FAILURE: 'character/load/failure',

  LOAD_CLASSES: 'class/load',
  LOAD_CLASSES_SUCCESS: 'class/load/success',
  LOAD_CLASSES_FAILURE: 'class/load/failure',

  SAVE_CHARACTER: 'character/save',
  SAVE_CHARACTER_SUCCESS: 'character/save/success',
  SAVE_CHARACTER_FAILURE: 'character/save/failure',

  DELETE_CHARACTER: 'character/delete',
  DELETE_CHARACTER_SUCCESS: 'character/delete/success',
  DELETE_CHARACTER_FAILURE: 'character/delete/failure',

  EDIT_CHARACTER: 'character/edit',
  MUST_SAVE_CHANGE: 'character/mustSaveChange',
  CLEAR_ERROR: 'character/clearError',
}

const T = CharacterActionTypes

export const loadCharacters = () => ({ type: T.LOAD_CHARACTERS })
export const loadCharactersSuccess = (characters) => ({ type: T.LOAD_CHARACTERS_SUCCESS, characters })
export const loadCharactersFailure = (errorMessage) => ({ type: T.LOAD_CHARACTERS_FAILURE, errorMessage })

export const loadClasses = () => ({ type: T.LOAD_CLASSES })
export const loadClassesSuccess = (classes) => ({ type: T.LOAD_CLASSES_SUCCESS, classes })
export const loadClassesFailure = (errorMessage) => ({ type: T.LOAD_CLASSES_FAILURE, errorMessage })

export const saveCharacter = (character) => ({ type: T.SAVE_CHARACTER, character })
export const saveCharacterSuccess = (character) => ({ type: T.SAVE_CHARACTER_SUCCESS, character })
export const saveCharacterFailure = (errorMessage) => ({ type: T.SAVE_CHARACTER_FAILURE, errorMessage })

export const deleteCharacter = (id) => ({ type: T.DELETE_CHARACTER, id })
export const deleteCharacterSuccess = (id) => ({ type: T.DELETE_CHARACTER_SUCCESS, id })
export const deleteCharacterFailure = (errorMessage) => ({ type: T.DELETE_CHARACTER_FAILURE, errorMessage })

export const editCharacter = (id) => ({ type: T.EDIT_CHARACTER, id })
export const mustSaveChange = (mustSave) => ({ type: T.MUST_SAVE_CHANGE, mustSave })
export const clearError = () => ({ type: T.CLEAR_ERROR })
