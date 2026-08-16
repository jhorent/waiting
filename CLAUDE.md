# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a modern browser (Chrome, Edge, Firefox). No build step, no server, no package manager.

## Architecture

Three files, no framework, no bundler:

| File | Role |
|---|---|
| `index.html` | DOM structure — form, two-tab layout (waiting list + archives), toast |
| `style.css` | Custom styles layered on top of Bootstrap 5.3.3 (CDN) |
| `app.js` | All application logic — ~560 lines, no modules |

**External dependency:** Bootstrap 5.3.3 loaded from `cdn.jsdelivr.net` (CSS + JS bundle). No other dependencies.

## Data layer

All persistence is `localStorage` — no backend, no sync across devices.

| Key | Content |
|---|---|
| `kine_patients` | Active waiting list (JSON array) |
| `kine_patients_archives` | Archived patients (JSON array) |
| `kine_shadow_backup` | Last auto-export snapshot |
| `kine_autoexport_minutes` | Auto-export interval setting |

Load/save via `loadPatients()` / `savePatients()` and `loadArchives()` / `saveArchives()`. Every write sets `isDirty = true` to gate auto-export.

## Patient object shape

```json
{
  "id": 1719571234567,        // Date.now() at creation
  "prenom": "Jean",
  "nom": "Dupont",
  "telephone": "06 12 34 56 78",
  "email": "jean@mail.com",   // optional
  "motif": "Lombalgie",
  "dateEntree": "2026-06-28",
  "dateDisponibilite": "2026-07-15",  // optional
  "joursDisponibles": ["lun", "mer"], // subset of lun/mar/mer/jeu/ven
  "statut": "en_attente",
  "dateStatutChange": "2026-06-28T14:32:00.000Z"
}
```

Archived patients add `dateArchivage` (ISO 8601). Status values: `en_attente`, `message_laisse`, `refuse`, `rdv_confirme`. Archives cannot have status `en_attente`.

## Rendering flow

`renderAll()` is the single re-render entry point. It reads the current search query, calls `renderTable()` and `renderArchives()`, then calls `updateSortHeaders()`. Table rows are built via string concatenation (`innerHTML`). All user-supplied strings pass through `escapeHtml()` before insertion.

Sort state is held in module-level `patientSort` / `archiveSort` objects `{ field, dir }`. `applySort()` applies the current sort or falls back to insertion order (by `id`).

## Edit mode

`editState = { id, source }` signals that the form is in edit mode (`source` is `'patients'` or `'archives'`). The form header turns orange. `cancelEdit()` clears `editState` and resets the header. The form `submit` handler branches on `editState` to update vs. create.

## Key conventions

- Phone numbers are formatted `XX XX XX XX XX` by `formatPhone()` on every `input` event.
- Duplicate detection checks name+firstname pair OR phone number against the active waiting list only (not archives).
- Import via `normalizeImport()` repairs missing/duplicate IDs and normalises status strings before writing to storage.
- `enh02.txt` is a historical diff log of past enhancement sessions — reference only, not executed.
