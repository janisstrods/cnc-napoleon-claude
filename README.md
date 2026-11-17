# Commands & Colours: Napoleonics

A work-in-progress, unofficial browser edition of Richard Borg's *Commands & Colors: Napoleonics* (GMT Games), with
British spelling in its title. **The code is still the Ancients game**: this project started from the Commands &
Colors: Ancients edition (v1.6.2), and later plans replace its engine and content. The roadmap is in
`design/superpowers/plans/2026-11-17-plan-1-foundations.md`; the Ancients design docs are kept in `design/ancients/`.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build the static site into `docs/` (served by GitHub Pages) |
| `npm test` | Rules-engine, rules, scenario, art, UI, AI and golden-game tests (Vitest) |
| `npm run typecheck` | TypeScript only |

Dev shortcuts (still the Ancients battles for now): `#/play/007/bottom/tribune` starts a battle directly, and
`#/gallery/art`, `#/gallery/terrain`, `#/gallery/kit` show the art galleries. In dev, `window.__ccn` is the game
controller.

## Credits

Unofficial fan edition, not affiliated with or endorsed by GMT Games. *Commands & Colors* is a trademark of GMT Games
LLC. All artwork is original. Fonts: Cinzel and EB Garamond (SIL OFL). Icons: game-icons.net (CC BY 3.0).
See `CREDITS.md`.
