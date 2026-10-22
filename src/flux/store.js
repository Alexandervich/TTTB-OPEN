import { navigate } from '../navigation.js'
import { characterApi } from './api.js'
import { characterEffects } from './characterEffects.js'
import { characterReducer, initialCharacterState } from './characterReducer.js'
import { createStore } from './createStore.js'

export const store = createStore({
  reducer: characterReducer,
  initialState: initialCharacterState,
  effects: [characterEffects],
  context: { api: characterApi, navigate },
})

export const { dispatch, useSelector } = store
