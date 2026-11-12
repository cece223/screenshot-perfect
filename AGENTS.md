<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The game lives in `src/game/`: `sim/` is pure TypeScript (rules, economy, customer AI, layout; no React/three imports, unit-tested with vitest), `scene/` draws sim state with React Three Fiber, `ui/` is the DOM HUD and menus. Why: rules stay testable without a GPU.
- `src/routes/index.tsx` lazy-loads `src/game/Game.tsx` inside `<ClientOnly>` with `ssr: false`. Why: three.js and localStorage must never run during SSR/worker module evaluation.
- Per-frame state (player, camera, customers) lives in the lazily created `getWorld()` object; zustand (`src/game/store.ts`, persisted to localStorage) holds only UI-facing state. One `Stepper` useFrame advances input → player → interactions → sim → camera. Why: no 60 fps React re-renders.
- In R3F code, key any element whose structure switches with data (hair style, garment shape, ternaries). Why: the dev server injects `data-tsd-source` on every JSX element and R3F throws when one intrinsic element is updated in place from a different source line.
- Dev-only hooks: `window.__game` (`state`, `store`, `sim(seconds)`, `teleport(x,z,heading)`, `setYaw`, `checkout()`, `interact(id)`), and `[data-game-root][data-scene-ready]` once models have drawn. Why: sandbox WebGL is too slow to play in real time.
