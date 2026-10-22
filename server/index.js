import { createApp } from './app.js'
import { openDatabase } from './db.js'
import { createRepository } from './repository.js'

const port = Number(process.env.PORT ?? 3001)
const app = createApp(createRepository(openDatabase()))

app.listen(port, () => {
  console.log(`TTTB server listening on http://localhost:${port}`)
})
