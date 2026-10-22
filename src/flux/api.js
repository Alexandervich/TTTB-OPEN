async function request(method, path, body) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server. Is it running?')
  }

  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status}).`)
  }
  return payload
}

export const characterApi = {
  getCharacters: async () => (await request('GET', '/characters')).characters,
  getClasses: () => request('GET', '/classes'),
  addCharacter: (character) => request('POST', '/characters', character),
  updateCharacter: (character) => request('PUT', `/characters/${character.id}`, character),
  deleteCharacter: (id) => request('DELETE', `/characters/${id}`),
}
