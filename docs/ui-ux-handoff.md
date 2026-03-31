# UI / UX Handoff Notes

This prototype now treats the front end as a set of semantic scenes and surfaces rather than one monolithic React file.

## What A Designer Can Touch Safely

- `src/ui/AppHeader.tsx`
  Header shell used by landing, duel, and sandbox scenes.
- `src/ui/LandingScreen.tsx`
  Mode-select front door.
- `src/ui/DuelBoard.tsx`
  The playable table surface for the current duel engine.
- `src/ui/DuelSidebar.tsx`
  Right rail for inspector, designer, and log.
- `src/ui/ModeSandboxView.tsx`
  Sandbox composition for non-duel topologies.
- `src/ui/ModeTopologyBoard.tsx`
  Seat and lane visualization for raid boss / FFA / 2v2 shells.
- `src/ui/ModeConceptPanel.tsx`
  Semantic remaps and ritual concept cards.
- `src/ui/CardInspector.tsx`
  Raw semantic payload presentation.
- `src/styles.css`
  Design-token layer plus scene/component styling hooks.

If the goal is visual exploration rather than gameplay changes, most work should stay inside those files.

## Scene Model

There are three top-level scenes, exposed with `data-scene`:

- `landing`
  Product front door and mode selection.
- `duel`
  Current fully playable match.
- `sandbox`
  Topology previews and design exploration for future modes.

The app shell and header both expose `data-scene`, so it is easy to theme entire scenes differently.

## Surface Model

Major panels expose `data-surface` values so a designer can target them semantically instead of chasing nested class names:

- `header`
- `badge`
- `table`
- `sidebar`
- `inspector`
- `designer`
- `log`
- `forecast`
- `hand`
- `topology-board`
- `semantic-shifts`
- `rituals`

These surfaces are intentionally stable even if the internal layout evolves.

## Styling Hooks

Important `data-*` hooks already in the markup:

- Cards: `data-faction`, `data-card-kind`, `data-selected`
- Board units: `data-faction`, `data-owner`, `data-selected`, `data-targetable`
- Heroes: `data-selected`, `data-targetable`
- Mode cards: `data-mode-id`, `data-mode-support`
- Topology sections: `data-topology-section`, `data-section-emphasis`
- Topology seats: `data-seat-id`, `data-seat-accent`, `data-seat-team`
- Forecast cards: `data-forecast-kind`

That means a visual pass can introduce radically different treatments for factions, bosses, allies, rivals, or playable-vs-preview modes without changing engine code.

## Design Tokens

The top of `src/styles.css` now contains the first token layer:

- text colors
- accent colors
- surface colors
- border colors
- radii
- shadows
- scene backgrounds

If someone wants to restyle the whole app quickly, start there before editing component rules.

## Layout Intent

- `App.tsx` should stay mostly orchestration and game-state wiring.
- `src/ui/*` should own layout, copy presentation, and art direction hooks.
- `src/game/*` should remain gameplay / semantics only.

If a redesign requires changing combat flow, targeting rules, or semantic text generation, that is a game-system task. If it only changes how information is grouped, framed, animated, or skinned, it should stay in the UI layer.

## Good Next Steps For A UI Specialist

- Split `src/styles.css` into scene-oriented files once the visual direction is chosen.
- Replace placeholder type and color choices with a more intentional brand system.
- Introduce stronger hierarchy between “playable action surface” and “debug / semantic tooling”.
- Explore alternate card compositions using the stable data hooks instead of changing engine data shapes.
- Add richer illustration slots or faction-specific frames using `data-faction` hooks.

## Intentionally Not Solved Yet

- The duel is the only fully live engine mode.
- Ritual windows are concept cards right now, not interactive mechanics.
- The current UI still privileges clarity over spectacle.

That is deliberate: the codebase is now set up so a UI / UX expert can iterate hard on presentation without having to untangle the semantic rules engine first.
