import { app, BrowserWindow, shell } from 'electron'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../server/app.js'
import { openDatabase } from '../server/db.js'
import { createRepository } from '../server/repository.js'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')
let httpServer

function startServer() {
  const db = openDatabase(join(app.getPath('userData'), 'tttb.db'))
  const expressApp = createApp(createRepository(db), { staticDir: join(root, 'dist') })
  return new Promise((resolveStart) => {
    // Port 0 picks a free port; bound to loopback so it is not exposed to the network.
    httpServer = expressApp.listen(0, '127.0.0.1', () => resolveStart(httpServer.address().port))
  })
}

async function createWindow() {
  const port = await startServer()
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  const origin = `http://127.0.0.1:${port}`
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })
  await win.loadURL(origin)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  httpServer?.close()
  app.quit()
})
