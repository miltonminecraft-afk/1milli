# onemillie — Inrichting kiezen

Private ChatGPT Site: https://onemillie-keuzes.idealtang512.chatgpt.site

63 curated assets with original maker previews, 3D viewers, categories, search, quantities and notes.
The earlier confirmed selection is the initial state. A new room is deliberately not preselected.

## Saved choices

The user presses **Keuzes opslaan**. The server validates IDs and integer quantities (1–99), enriches them with catalog names/codes, and persists a revisioned record in D1 table `asset_selections`. The stable row ID is `main`.

An agent can read the owner's choices with Sites `read_database_overview` followed by `read_database_table_rows` for project `appgprj_6adf8b75e83c81918a76b55b2e4173d4`. The row contains `selection_json`, `notes`, `revision`, and `updated_at`. The browser can also read `GET /api/selection` with its authenticated ChatGPT session.

Keep the Site owner-private. The first saving user is pinned as record owner; writes also require same-origin requests and matching revisions. No token is embedded in the browser. Local drafts are a fallback, not the shared data store.

## Development

- `npm run dev -- --hostname 127.0.0.1 --port 4271`
- `node tests/selection.test.mjs`
- `npx tsc --noEmit`
- `npm run build`

Use the Sites publication workflow. Schema migrations are in `drizzle/`. Local and hosted D1 are separate.
Catalog data and attribution: `data/catalog.json`. The models themselves stay at their sources; the site contains original thumbnails and embedded viewers.
