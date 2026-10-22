export const selectCharacters = (state) => state.characters
export const selectCharacterCount = (state) => state.characters.length
export const selectClasses = (state) => state.classes
export const selectIsLoading = (state) => state.isLoading
export const selectIsSaving = (state) => state.isSaving
export const selectMustSave = (state) => state.mustSave
export const selectError = (state) => state.error
export const selectEditingCharacter = (state) =>
  state.characters.find((c) => c.id === state.editingId) ?? null
