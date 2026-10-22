import { useSyncExternalStore } from 'react'

// Minimal Flux store: actions -> reducer -> state, with effects for side effects
// (the equivalent of Fluxor's [ReducerMethod] / [EffectMethod]).
export function createStore({ reducer, initialState, effects = [], context = {} }) {
  let state = initialState
  const listeners = new Set()

  const getState = () => state

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function dispatch(action) {
    state = reducer(state, action)
    listeners.forEach((listener) => listener())
    // Effects run after the reducer so they observe the updated state.
    effects.forEach((effect) => {
      Promise.resolve(effect(action, { dispatch, getState, ...context })).catch((error) => {
        console.error('Unhandled effect error', error)
      })
    })
  }

  function useSelector(selector) {
    return useSyncExternalStore(subscribe, () => selector(state))
  }

  return { getState, subscribe, dispatch, useSelector }
}
