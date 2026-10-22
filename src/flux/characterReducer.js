import { CharacterActionTypes as T } from './characterActions.js'

export const initialCharacterState = {
  isLoading: false,
  isSaving: false,
  isEditing: false,
  mustSave: false,
  characters: [],
  classes: [],
  editingId: null,
  error: '',
}

export function characterReducer(state = initialCharacterState, action) {
  switch (action.type) {
    case T.LOAD_CHARACTERS:
      return { ...state, isLoading: true, error: '' }
    case T.LOAD_CHARACTERS_SUCCESS:
      return { ...state, isLoading: false, characters: action.characters }
    case T.LOAD_CHARACTERS_FAILURE:
      return { ...state, isLoading: false, error: action.errorMessage }

    case T.LOAD_CLASSES_SUCCESS:
      return { ...state, classes: action.classes }
    case T.LOAD_CLASSES_FAILURE:
      return { ...state, error: action.errorMessage }

    case T.SAVE_CHARACTER:
      return { ...state, isSaving: true, error: '' }
    case T.SAVE_CHARACTER_SUCCESS: {
      const exists = state.characters.some((c) => c.id === action.character.id)
      const characters = exists
        ? state.characters.map((c) => (c.id === action.character.id ? action.character : c))
        : [...state.characters, action.character]
      return { ...state, isSaving: false, characters, error: '' }
    }
    case T.SAVE_CHARACTER_FAILURE:
      return { ...state, isSaving: false, error: action.errorMessage }

    case T.DELETE_CHARACTER_SUCCESS:
      return { ...state, characters: state.characters.filter((c) => c.id !== action.id) }
    case T.DELETE_CHARACTER_FAILURE:
      return { ...state, error: action.errorMessage }

    case T.EDIT_CHARACTER:
      return { ...state, isEditing: action.id !== null, editingId: action.id, error: '' }
    case T.MUST_SAVE_CHANGE:
      return { ...state, mustSave: action.mustSave }
    case T.CLEAR_ERROR:
      return { ...state, error: '' }

    default:
      return state
  }
}
