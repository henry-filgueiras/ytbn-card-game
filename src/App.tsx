import { useEffect, useMemo, useState } from "react";
import { getCardById } from "./data/cards";
import { getDeckById } from "./data/decks";
import { renderCardRules, renderTarget } from "./game/text";
import {
  createGame,
  endTurn,
  getBoardCard,
  getCombatForecast,
  getLaneCount,
  getPlayPreview,
  heroEntityId,
  playCard,
  runAiTurn,
  shouldAutoEndTurn,
  unitEntityId
} from "./game/engine";
import type { CardDefinition } from "./game/types";
import { BoardUnit } from "./ui/BoardUnit";
import { CardView } from "./ui/CardView";
import { CardDesigner } from "./ui/CardDesigner";
import { CombatForecast } from "./ui/CombatForecast";
import { HeroPanel } from "./ui/HeroPanel";

interface InspectSelection {
  cardId?: string;
  entityId?: string;
}

function winnerLabel(winner: ReturnType<typeof createGame>["winner"]): string {
  if (winner === "player") {
    return "You win";
  }

  if (winner === "ai") {
    return "AI wins";
  }

  if (winner === "draw") {
    return "Draw";
  }

  return "";
}

export default function App() {
  const [game, setGame] = useState(() => createGame());
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [inspection, setInspection] = useState<InspectSelection>({});

  const selectedCardId =
    selectedHandIndex != null ? game.players.player.hand[selectedHandIndex] ?? undefined : inspection.cardId;
  const selectedCard = selectedCardId ? getCardById(selectedCardId) : null;
  const selectedBoardCard = inspection.entityId ? getBoardCard(game, inspection.entityId) : null;
  const inspectedCard = selectedCard ?? selectedBoardCard ?? null;

  const preview =
    selectedHandIndex != null ? getPlayPreview(game, "player", selectedHandIndex, selectedLane ?? undefined) : null;

  useEffect(() => {
    if (selectedHandIndex == null) {
      return;
    }

    const stillExists = selectedHandIndex < game.players.player.hand.length;

    if (!stillExists || game.currentPlayer !== "player" || game.winner) {
      setSelectedHandIndex(null);
      setSelectedLane(null);
    }
  }, [game, selectedHandIndex]);

  useEffect(() => {
    if (game.currentPlayer !== "ai" || game.winner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setGame((current) => runAiTurn(current));
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [game.currentPlayer, game.turnNumber, game.winner]);

  const targetableIds = useMemo(() => new Set(preview?.targetOptions ?? []), [preview?.targetOptions]);
  const laneCount = getLaneCount();
  const combatForecast = useMemo(() => getCombatForecast(game, game.currentPlayer), [game]);

  const prompt = useMemo(() => {
    if (game.winner) {
      return `${winnerLabel(game.winner)}. Start a new match to play again.`;
    }

    if (game.currentPlayer === "ai") {
      return "AI is taking its turn.";
    }

    if (!selectedCard || !preview) {
      return "Main phase: play cards now, then end the turn to resolve combat.";
    }

    if (!preview.playable) {
      return `${selectedCard.name} cannot be played right now.`;
    }

    if (preview.requiresLane && selectedLane == null) {
      return `Choose an empty lane for ${selectedCard.name}.`;
    }

    if (preview.requiresTarget && preview.chosenTargetSpec) {
      return `Choose ${renderTarget(preview.chosenTargetSpec)} for ${selectedCard.name}.`;
    }

    return `${selectedCard.name} is ready to play.`;
  }, [game.currentPlayer, game.winner, preview, selectedCard, selectedLane]);

  function resetMatch() {
    setGame(createGame());
    setSelectedHandIndex(null);
    setSelectedLane(null);
    setInspection({});
  }

  function commitPlay(options?: { targetId?: string; lane?: number }) {
    if (selectedHandIndex == null) {
      return;
    }

    let next = playCard(game, "player", {
        handIndex: selectedHandIndex,
        lane: options?.lane ?? selectedLane ?? undefined,
        targetId: options?.targetId
      });

      if (next === game) {
        return;
      }

      if (shouldAutoEndTurn(next, "player")) {
        next = endTurn(next);
      }

    setGame(next);
    setSelectedHandIndex(null);
    setSelectedLane(null);
  }

  function handleHandCardClick(handIndex: number) {
    if (game.currentPlayer !== "player" || game.winner) {
      return;
    }

    const cardId = game.players.player.hand[handIndex];
    setInspection({ cardId });

    if (selectedHandIndex === handIndex) {
      setSelectedHandIndex(null);
      setSelectedLane(null);
      return;
    }

    setSelectedHandIndex(handIndex);
    setSelectedLane(null);
  }

  function handleLaneClick(ownerId: "player" | "ai", lane: number) {
    const occupant = game.players[ownerId].lanes[lane];

    if (occupant) {
      const entityId = unitEntityId(occupant.instanceId);
      setInspection({ entityId });

      if (selectedHandIndex != null && targetableIds.has(entityId)) {
        commitPlay({ targetId: entityId });
      }

      return;
    }

    if (ownerId !== "player" || selectedHandIndex == null || game.currentPlayer !== "player" || game.winner) {
      return;
    }

    const handCardId = game.players.player.hand[selectedHandIndex];
    const handCard = getCardById(handCardId);

    if (handCard.kind !== "unit") {
      return;
    }

    const lanePreview = getPlayPreview(game, "player", selectedHandIndex, lane);

    if (!lanePreview.playable) {
      setSelectedLane(lane);
      return;
    }

    if (lanePreview.requiresTarget) {
      setSelectedLane(lane);
      return;
    }

    setSelectedLane(lane);
    commitPlay({ lane });
  }

  function handleHeroClick(playerId: "player" | "ai") {
    const entityId = heroEntityId(playerId);
    setInspection({ entityId });

    if (selectedHandIndex != null && targetableIds.has(entityId)) {
      commitPlay({ targetId: entityId });
    }
  }

  function playSelectedSpell() {
    if (!selectedCard || selectedCard.kind !== "spell" || !preview || preview.requiresTarget || !preview.playable) {
      return;
    }

    commitPlay();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Semantic Lane Duel</h1>
          <p>
            Cards are authored as structured abilities and rendered into language that the engine also resolves.
          </p>
        </div>
        <div className="topbar__actions">
          <div className="deck-chip">
            You: {getDeckById("emberRush").name} vs AI: {getDeckById("verdantWard").name}
          </div>
          <button type="button" className="primary-button" onClick={resetMatch}>
            New Match
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="table-panel">
          <div className="status-bar">
            <div>
              <strong>Turn {game.turnNumber}</strong> · {game.currentPlayer === "player" ? "Your turn" : "AI turn"}
            </div>
            <div>{prompt}</div>
          </div>

          {game.winner ? <div className="winner-banner">{winnerLabel(game.winner)}</div> : null}

          <HeroPanel
            label="AI Hero"
            health={game.players.ai.hero.health}
            maxHealth={game.players.ai.hero.maxHealth}
            deckCount={game.players.ai.deck.length}
            handCount={game.players.ai.hand.length}
            discardCount={game.players.ai.discard.length}
            targetable={targetableIds.has(heroEntityId("ai"))}
            selected={inspection.entityId === heroEntityId("ai")}
            onClick={() => handleHeroClick("ai")}
          />

          <div className="lane-grid">
            {Array.from({ length: laneCount }, (_, lane) => {
              const aiUnit = game.players.ai.lanes[lane];
              const playerUnit = game.players.player.lanes[lane];
              const laneIsSelectable =
                selectedCard?.kind === "unit" &&
                selectedHandIndex != null &&
                game.currentPlayer === "player" &&
                !game.players.player.lanes[lane];

              return (
                <div key={lane} className={`lane-column${selectedLane === lane ? " is-selected" : ""}`}>
                  <div className="lane-slot" onClick={() => handleLaneClick("ai", lane)} role="presentation">
                    {aiUnit ? (
                      <BoardUnit
                        unit={aiUnit}
                        selected={inspection.entityId === unitEntityId(aiUnit.instanceId)}
                        targetable={targetableIds.has(unitEntityId(aiUnit.instanceId))}
                        badges={
                          game.currentPlayer === "ai" && aiUnit.summonedOnTurn === game.turnNumber
                            ? ["Summoning sickness"]
                            : []
                        }
                        onClick={() => handleLaneClick("ai", lane)}
                      />
                    ) : (
                      <div className="lane-slot__empty">Open enemy lane</div>
                    )}
                  </div>

                  <div className="lane-column__label">{["Left", "Center", "Right"][lane]} lane</div>

                  <div className={`lane-slot${laneIsSelectable ? " lane-slot--playable" : ""}`} onClick={() => handleLaneClick("player", lane)} role="presentation">
                    {playerUnit ? (
                      <BoardUnit
                        unit={playerUnit}
                        selected={inspection.entityId === unitEntityId(playerUnit.instanceId)}
                        targetable={targetableIds.has(unitEntityId(playerUnit.instanceId))}
                        badges={
                          game.currentPlayer === "player" && playerUnit.summonedOnTurn === game.turnNumber
                            ? ["Summoning sickness"]
                            : []
                        }
                        onClick={() => handleLaneClick("player", lane)}
                      />
                    ) : (
                      <div className="lane-slot__empty">{laneIsSelectable ? "Click to deploy here" : "Open allied lane"}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <HeroPanel
            label="Your Hero"
            health={game.players.player.hero.health}
            maxHealth={game.players.player.hero.maxHealth}
            energy={game.players.player.energy}
            maxEnergy={game.players.player.maxEnergy}
            deckCount={game.players.player.deck.length}
            handCount={game.players.player.hand.length}
            discardCount={game.players.player.discard.length}
            targetable={targetableIds.has(heroEntityId("player"))}
            selected={inspection.entityId === heroEntityId("player")}
            onClick={() => handleHeroClick("player")}
          />

          <div className="controls-row">
            <button
              type="button"
              className="primary-button"
              onClick={playSelectedSpell}
              disabled={!selectedCard || selectedCard.kind !== "spell" || !preview || preview.requiresTarget || !preview.playable}
            >
              Play Selected Spell
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelectedHandIndex(null);
                setSelectedLane(null);
              }}
              disabled={selectedHandIndex == null}
            >
              Clear Selection
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelectedHandIndex(null);
                setSelectedLane(null);
                setGame((current) => endTurn(current));
              }}
              disabled={game.currentPlayer !== "player" || Boolean(game.winner)}
            >
              End Turn & Resolve Combat
            </button>
          </div>

          <CombatForecast forecasts={combatForecast} />

          <section className="hand-panel">
            <div className="hand-panel__header">
              <h2>Your Hand</h2>
              <span>{game.players.player.hand.length} cards</span>
            </div>
            <div className="hand-grid">
              {game.players.player.hand.map((cardId, handIndex) => (
                <CardView
                  key={`${cardId}-${handIndex}`}
                  card={getCardById(cardId)}
                  selected={selectedHandIndex === handIndex}
                  disabled={game.currentPlayer !== "player" || Boolean(game.winner)}
                  onClick={() => handleHandCardClick(handIndex)}
                  label={selectedHandIndex === handIndex ? "Selected" : undefined}
                />
              ))}
            </div>
          </section>
        </section>

        <aside className="side-panel">
          <section className="inspector">
            <div className="inspector__header">
              <h2>Inspector</h2>
              <span>Rendered rules + semantic data</span>
            </div>

            {inspectedCard ? (
              <>
                <div className={`inspector-card faction-${inspectedCard.faction}`}>
                  <div className="inspector-card__title">
                    <div>
                      <strong>{inspectedCard.name}</strong>
                      <div className="inspector-card__meta">
                        {inspectedCard.kind === "unit"
                          ? `${inspectedCard.attack}/${inspectedCard.health} unit`
                          : "spell"}{" "}
                        · cost {inspectedCard.cost}
                      </div>
                    </div>
                    <span>{inspectedCard.faction}</span>
                  </div>
                  <div className="inspector-card__rules">
                    {renderCardRules(inspectedCard).map((rule) => (
                      <div key={rule}>{rule}</div>
                    ))}
                  </div>
                </div>

                <pre className="semantic-json">{JSON.stringify(inspectedCard, null, 2)}</pre>
              </>
            ) : (
              <div className="empty-panel">Select a card in hand or a unit on the board to inspect it.</div>
            )}
          </section>

          <CardDesigner seedCard={inspectedCard} />

          <section className="log-panel">
            <div className="inspector__header">
              <h2>Event Log</h2>
              <span>Most recent events first</span>
            </div>
            <div className="log-entries">
              {[...game.log].reverse().map((entry, index) => (
                <div key={`${entry}-${index}`} className="log-entry">
                  {entry}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
