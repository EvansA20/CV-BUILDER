# Careerfy — CV & Portfolio Builder

A frontend-only React and TypeScript MVP for creating, editing, previewing, saving, and exporting CVs. CVs and profile photos are stored in IndexedDB in the current browser profile. No account or custom backend is used.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.
Run the data validation and PDF pagination tests with `npm test`.

## Included

- Landing page, CV dashboard, editor, four templates, preview/export page, and settings
- Live preview, section CRUD and ordering, email/link validation, and image processing
- Debounced IndexedDB autosave with visible save state and errors
- Browser print styles, multipage PDF export, single-CV and full-workspace JSON backup/restore
- Light and dark workspace themes, responsive mobile edit/preview tabs, and local data deletion

Careerfy stores personal details locally by default. Clearing browser storage can remove saved CVs; export a JSON backup if you need an independent copy.

# CV-BUILDER
