# TTTB React Application

This project is a React/Vite copy of the TTTB web application layout and character creator flow.

## Available pages

- `/` — home page
- `/character/create` — character creation form with JSON preview on save
- `/weather` — weather placeholder page

## Development

```bash
npm install
npm run dev
```

## Windows desktop app (Electron)

Runs fully locally: the app starts the Express API on a random loopback port and
stores data in the OS user-data directory (`tttb.db`).

```bash
npm run desktop   # build the UI and launch the desktop window
npm run dist      # build Windows installer + portable .exe into release/
```
