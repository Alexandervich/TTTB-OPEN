import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseAndRollDetail } from './domain/diceParser.js'
import { ConflictError, NotFoundError, ValidationError } from './repository.js'

const STATUS_BY_ERROR = [
  [ValidationError, 400],
  [NotFoundError, 404],
  [ConflictError, 409],
]

export function createApp(repository, { staticDir = resolve('dist') } = {}) {
  const app = express()
  app.use(express.json({ limit: '200kb' }))

  const api = express.Router()

  api.get('/health', (_req, res) => res.json({ status: 'ok' }))
  api.get('/classes', (_req, res) => res.json(repository.listClasses()))

  api.post('/classes', (req, res) => res.status(201).json(repository.createClass(req.body)))
  api.get('/classes/:id', (req, res) => res.json(repository.getClass(req.params.id)))
  api.put('/classes/:id', (req, res) => res.json(repository.updateClass(req.params.id, req.body)))

  api.delete('/classes/:id', (req, res) => {
    repository.deleteClass(req.params.id)
    res.status(204).end()
  })

  api.get('/characters', (_req, res) => {
    const characters = repository.getCharacters()
    res.json({ characters, count: characters.length })
  })

  api.get('/characters/:id', (req, res) => {
    const character = repository.getCharacter(req.params.id)
    if (!character) throw new NotFoundError('Character not found.')
    res.json(character)
  })

  api.post('/characters/roll', (req, res) => {
    res.json(repository.rollCharacter(req.body))
  })

  api.post('/characters', (req, res) => {
    res.status(201).json(repository.addCharacter(req.body))
  })

  api.put('/characters/:id', (req, res) => {
    res.json(repository.updateCharacter(req.params.id, req.body))
  })

  api.delete('/characters/:id', (req, res) => {
    if (!repository.deleteCharacter(req.params.id)) throw new NotFoundError('Character not found.')
    res.status(204).end()
  })

  api.get('/dice/:expression', (req, res) => {
    try {
      res.json(parseAndRollDetail(req.params.expression))
    } catch (error) {
      throw new ValidationError(error.message)
    }
  })

  api.use((_req, _res, next) => next(new NotFoundError('Not found.')))
  app.use('/api', api)

  if (existsSync(staticDir)) {
    app.use(express.static(staticDir))
    app.use((_req, res) => res.sendFile(resolve(staticDir, 'index.html')))
  }

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body.' })
    }
    const match = STATUS_BY_ERROR.find(([type]) => error instanceof type)
    if (match) return res.status(match[1]).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Internal server error.' })
  })

  return app
}
