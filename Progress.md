# Progress

Tod und Teufel Toolbox (TTTB): a character creator for the Tod & Teufel tabletop rules.

## Done

### Desktop application
- Packaged as a Windows desktop app with Electron ([electron/main.js](electron/main.js)).
- The app starts the Express API on a random loopback port (`127.0.0.1`) and opens a window on it. Nothing is exposed to the network.
- The SQLite database is stored in the user-data folder (`%APPDATA%\TTTB\tttb.db`).
- `npm run desktop` builds the UI and opens the window.
- `npm run dist` builds a Windows installer (NSIS) and a portable `.exe` into `release/`. Both were built, but only on Linux through Wine. They have not been run on Windows.
- Dev dependencies added: `electron`, `electron-builder`. UI fonts are bundled through `@fontsource` (`cinzel`, `cinzel-decorative`, `im-fell-english`) so they work offline.

### Design
- First a gothic look (blood red and gold), then reworked into eldritch horror and dark fantasy: abyssal black-teal, verdigris borders, sea-green glow, drifting fog, vignette, a flickering title with a watching eye, wavy divider under headings, matching favicon.
- Fog and flicker stop when the system asks for reduced motion. Printing gives a plain white sheet.
- Sidebar spacing and cut-off sheet boxes fixed (labels size to their text, boxes have full borders).
- Table text was unreadable (black on dark). Fixed by setting the Bootstrap table colours explicitly.
- Title set to "Tod und Teufel Toolbox". Home page text is in German.

### Character creation
- **Roll** button: rolls 3d6 for the ability scores, hit points for the chosen class and level, and the starting equipment. It fills the sheet and saves nothing.
- **Save** button: stores the character as shown. It refuses if the ability scores aren't set, and no longer re-rolls anything.
- New endpoint `POST /api/characters/roll`.
- Hit points are not recalculated if you change class, level or CON after rolling. Roll again to update them.

### Class editor (`/classes`)
- Edit the hit die and prime requisite per class.
- Edit, for all 20 levels: XP, attack bonus, HP bonus, expertise, the five saving throws, and spells per rank.
- Values are validated on save. XP must not decrease from one level to the next.
- **New Class** copies the selected class under a new name (unique, up to 40 characters).
- **Delete Class** is refused if characters use the class, or if it is the last class.
- Endpoints: `GET/POST /api/classes`, `GET/PUT/DELETE /api/classes/:id`.
- Edits apply to newly rolled or created characters. Saved characters keep their stored values.

### Removed
- The Counter page, its route, its nav entry and its icon.
- The STR-locked Packed Items lines were built and then reverted at your request. The `STR 18+` to `STR 4+` markers are plain labels again.

## Known limitations
- Built-in classes are re-seeded if `RULES_VERSION` in `server/db.js` is raised. That would overwrite edits to them and bring back deleted built-in classes. Classes you created are not touched.
- Classes can't be renamed, and the number of levels (20) is fixed.
- The Windows build is unsigned, so SmartScreen may warn. It uses the default Electron icon (no `.ico` in the project).
- The design changes were checked with builds only. No screenshots were taken because no display was available.

## Ideas for next steps
- Add an `.ico` app icon and wire it into the `build` config.
- Rename classes in the editor.
- Recalculate hit points on the sheet when class, level or CON changes.
- Move the built-in class data out of the re-seed path so edits to built-in classes survive updates.
