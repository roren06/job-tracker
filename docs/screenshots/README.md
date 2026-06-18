# Screenshots

Portfolio captures for the GitHub README. All files live in this folder.

## Files

| File | What it shows |
|------|----------------|
| `landing.png` | Landing page hero + Try Demo CTA |
| `board.png` | Kanban board with demo data loaded |
| `analytics.png` | Analytics dashboard (30D range) |
| `drawer.png` | Application drawer after double-clicking a card |
| `ai-drawer.png` | Same drawer with AI Assistant expanded at the bottom |

## Regenerate (automated)

With the client on `:5173` and API on `:4000`:

```bash
npm install playwright
npx playwright install chromium
node scripts/capture-screenshots.mjs
```

Optional: set `APP_URL` to capture from a deployed site instead of localhost.

## Manual capture

1. Open the live site or `npm run dev` locally.
2. Use **Try Demo** so the board looks populated.
3. Double-click a card for the drawer; expand **AI Assistant** for `ai-drawer.png`.
4. Capture at **1440×900** (or full browser width).
