# Semantic Arena Lab

Semantic Arena Lab is a local-only browser prototype for a card game where card language maps directly to structured semantic actions in the engine.

The important constraint in this project is that rules text is not the source of truth. Cards are authored as structured ability objects, and the same data is used to:

- resolve gameplay effects
- render English card text in the UI
- drive the inspector panel that shows the semantic schema

## Run It

```bash
npm install
npm run dev
```

Then open the local Vite URL in a browser.

Or use the Makefile:

```bash
make install
make dev
make storyboard
```

## Verify It

```bash
npm test
npm run build
```

Make equivalents:

```bash
make test
make build
```

## Mode Select

The app now opens on a landing screen with multiple topologies:

- `Lane Duel`: the current fully playable `1v1` mode
- `Raid Boss Engagement`: a `1v3` commander-style board shell
- `Triad Skirmish`: a `1v1v1` political triangle
- `Twinfront Clash`: a `2v2` partner board with a shared center
- `Topology Proof`: a semantic lab screen that shows one canonical card mutating across all four board geometries

Right now the duel is fully wired into the live engine. The larger multiplayer layouts load as topology sandboxes with board geometry, semantic remaps, and ritual design notes so we can evolve the engine toward them intentionally.

## Prototype Rules

- `1v1` match with `3` lanes
- Each hero starts at `20` health
- Both players begin with an opening hand of `4`, then draw `1` at the start of each turn
- Max energy increases by `1` each turn up to `8`, then refills
- Units are played into empty friendly lanes
- Spells resolve immediately and go to discard
- At the end of a player's turn, their units attack automatically:
  - if the opposing lane has a unit, combat is simultaneous
  - otherwise the attacker hits the enemy hero
- Units cannot attack on the turn they enter play
- If a hero reaches `0`, the game ends

## Clarity Helpers

- The board now shows a `Combat Forecast` panel so you can see what each lane will do when the current player ends the turn.
- Newly played units visibly show `Summoning sickness` during the turn where they cannot attack.
- The end-turn control is labeled to make it clearer that combat resolves immediately afterward.
- The card designer starts collapsed so the match UI stays focused until you explicitly open the tool.
- The card designer now enforces a build-budget system: mana cost buys a budget cap, unit stats consume part of it, and every trigger/effect package has a visible spend.
- The landing screen keeps the duel flow stable while also letting you inspect future multiplayer topologies.

## Topology And Ritual Concepts

The non-duel modes are there to pressure-test the semantic language:

- `chosenEnemy`, `adjacentAlly`, and `allEnemies` no longer have one universal meaning once the board is not purely mirrored
- board topology becomes part of the rules language, not just presentation
- quick-time / latency-sensitive `ritual windows` are sketched as first-class concepts with canonical syntax and gameplay intent

Those ritual ideas are not implemented in the live duel engine yet. They are presented in the mode side panels as design targets for the next layer of the system.

## Storyboard

- Source SVG: [`storyboard/semantic-lane-duel-storyboard.svg`](/Users/henry/ytbn-card-game/storyboard/semantic-lane-duel-storyboard.svg)
- Rendered PNG: [`storyboard/semantic-lane-duel-storyboard.png`](/Users/henry/ytbn-card-game/storyboard/semantic-lane-duel-storyboard.png)
- Regenerate it with `make storyboard`

## Semantic Schema

Abilities are composed from small semantic pieces:

- `trigger`: `onPlay`, `onDeath`, `startOfTurn`, `endOfTurn`, `onAttack`
- `selector`: `self`, `chosenAlly`, `chosenEnemy`, `randomEnemy`, `adjacentAlly`, `opposingUnitThisLane`, `allAllies`, `allEnemies`, `friendlyHero`, `enemyHero`
- `filters`: `unit`, `hero`, `damaged`
- `verbs`: `dealDamage`, `heal`, `drawCards`, `summonToken`, `grantStatus`, `modifyAttack`, `modifyHealth`, `destroy`
- `statuses`: `poisoned`, `stunned`, `shielded`, `burning`

Example authored ability shape:

```ts
ability(
  "onPlay",
  effect.damage(1, target.chosenEnemy()),
  effect.draw(1, target.friendlyHero())
)
```

This renders to:

```text
On play: Deal 1 damage to chosen enemy. Then Draw 1 card.
```

## Status Rules

- `poisoned`: unit takes damage equal to stacks at the start of its controller's turn
- `burning`: unit takes damage equal to stacks at the end of its controller's turn
- `shielded`: prevents the next damage event, then loses one stack
- `stunned`: causes the unit to skip its next attack, then loses one stack

## What To Look At

- [`src/game/types.ts`](/Users/henry/ytbn-card-game/src/game/types.ts): core schema for cards, abilities, units, and game state
- [`src/game/abilities.ts`](/Users/henry/ytbn-card-game/src/game/abilities.ts): semantic helper builders for targets and effects
- [`src/game/text.ts`](/Users/henry/ytbn-card-game/src/game/text.ts): card text generation from semantic data
- [`src/game/designer.ts`](/Users/henry/ytbn-card-game/src/game/designer.ts): card-draft helpers, canonical syntax previews, and term override support
- [`src/game/engine/game.ts`](/Users/henry/ytbn-card-game/src/game/engine/game.ts): turn flow, ability resolution, combat, death handling
- [`src/game/engine/forecast.ts`](/Users/henry/ytbn-card-game/src/game/engine/forecast.ts): end-of-turn combat forecasting for the UI
- [`src/game/engine/targeting.ts`](/Users/henry/ytbn-card-game/src/game/engine/targeting.ts): selector and filter resolution
- [`src/game/engine/ai.ts`](/Users/henry/ytbn-card-game/src/game/engine/ai.ts): simple heuristic AI
- [`src/data/cards.ts`](/Users/henry/ytbn-card-game/src/data/cards.ts): authored card set
- [`src/data/decks.ts`](/Users/henry/ytbn-card-game/src/data/decks.ts): fixed starter decks
- [`src/App.tsx`](/Users/henry/ytbn-card-game/src/App.tsx): landing flow, playable duel UI, and topology preview routing
- [`src/game/modes.ts`](/Users/henry/ytbn-card-game/src/game/modes.ts): mode definitions, topology metadata, semantic remaps, and ritual concepts
- [`src/game/proofCards.ts`](/Users/henry/ytbn-card-game/src/game/proofCards.ts): canonical test-card set for the topology proof surface
- [`src/game/topology.ts`](/Users/henry/ytbn-card-game/src/game/topology.ts): topology adapters, proof diagrams, transformed rendering, and preview-target computation
- [`src/ui/LandingScreen.tsx`](/Users/henry/ytbn-card-game/src/ui/LandingScreen.tsx): mode-selection landing page
- [`src/ui/TopologyProofScreen.tsx`](/Users/henry/ytbn-card-game/src/ui/TopologyProofScreen.tsx): dedicated proof surface for topology-sensitive semantics
- [`src/ui/TopologyDiagram.tsx`](/Users/henry/ytbn-card-game/src/ui/TopologyDiagram.tsx): intentional proof diagrams with legal-target highlighting
- [`src/ui/ModeTopologyBoard.tsx`](/Users/henry/ytbn-card-game/src/ui/ModeTopologyBoard.tsx): topology-aware board shells for non-duel modes
- [`src/ui/ModeConceptPanel.tsx`](/Users/henry/ytbn-card-game/src/ui/ModeConceptPanel.tsx): semantic shift and ritual concept panels
- [`src/ui/CardDesigner.tsx`](/Users/henry/ytbn-card-game/src/ui/CardDesigner.tsx): in-browser card designer with payload export and custom terminology
- [`docs/ui-ux-handoff.md`](/Users/henry/ytbn-card-game/docs/ui-ux-handoff.md): UI architecture notes, styling hooks, and handoff guidance for a visual designer
- [`src/game/engine/game.test.ts`](/Users/henry/ytbn-card-game/src/game/engine/game.test.ts): engine and text-generation tests

## Notes

- The UI intentionally favors clarity over polish so the semantic model is easy to inspect.
- The AI is deliberately simple. It tries to make reasonable plays, but the goal here is a demonstrable vertical slice rather than strong strategy.
- The inspector panel is the clearest proof of the concept: select a card and compare the rendered rules text with the raw ability structure.
