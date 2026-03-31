import { getCardById } from "../data/cards";
import { getLaneCount, heroEntityId, unitEntityId } from "../game/engine";
import type { CombatForecast, GameState, PlayPreview, CardDefinition } from "../game/types";
import { BoardUnit } from "./BoardUnit";
import { CardView } from "./CardView";
import { CombatForecast as CombatForecastPanel } from "./CombatForecast";
import { HeroPanel } from "./HeroPanel";

interface DuelBoardProps {
  game: GameState;
  prompt: string;
  selectedHandIndex: number | null;
  selectedLane: number | null;
  selectedCard: CardDefinition | null;
  preview: PlayPreview | null;
  inspectionEntityId?: string;
  targetableIds: Set<string>;
  combatForecast: CombatForecast[];
  onHeroClick: (playerId: "player" | "ai") => void;
  onLaneClick: (ownerId: "player" | "ai", lane: number) => void;
  onHandCardClick: (handIndex: number) => void;
  onPlaySelectedSpell: () => void;
  onClearSelection: () => void;
  onEndTurn: () => void;
}

export function DuelBoard({
  game,
  prompt,
  selectedHandIndex,
  selectedLane,
  selectedCard,
  preview,
  inspectionEntityId,
  targetableIds,
  combatForecast,
  onHeroClick,
  onLaneClick,
  onHandCardClick,
  onPlaySelectedSpell,
  onClearSelection,
  onEndTurn
}: DuelBoardProps) {
  const laneCount = getLaneCount();

  return (
    <section className="table-panel surface-panel" data-surface="table">
      <div className="status-bar">
        <div>
          <strong>Turn {game.turnNumber}</strong> · {game.currentPlayer === "player" ? "Your turn" : "AI turn"}
        </div>
        <div>{prompt}</div>
      </div>

      {game.winner ? <div className="winner-banner">{game.winner === "player" ? "You win" : game.winner === "ai" ? "AI wins" : "Draw"}</div> : null}

      <HeroPanel
        label="AI Hero"
        health={game.players.ai.hero.health}
        maxHealth={game.players.ai.hero.maxHealth}
        deckCount={game.players.ai.deck.length}
        handCount={game.players.ai.hand.length}
        discardCount={game.players.ai.discard.length}
        targetable={targetableIds.has(heroEntityId("ai"))}
        selected={inspectionEntityId === heroEntityId("ai")}
        onClick={() => onHeroClick("ai")}
      />

      <div className="lane-grid" data-lane-count={laneCount}>
        {Array.from({ length: laneCount }, (_, lane) => {
          const aiUnit = game.players.ai.lanes[lane];
          const playerUnit = game.players.player.lanes[lane];
          const laneIsSelectable =
            selectedCard?.kind === "unit" &&
            selectedHandIndex != null &&
            game.currentPlayer === "player" &&
            !game.players.player.lanes[lane];

          return (
            <div
              key={lane}
              className={`lane-column${selectedLane === lane ? " is-selected" : ""}`}
              data-lane-index={lane}
              data-lane-selected={selectedLane === lane ? "true" : "false"}
            >
              <div className="lane-slot" onClick={() => onLaneClick("ai", lane)} role="presentation">
                {aiUnit ? (
                  <BoardUnit
                    unit={aiUnit}
                    selected={inspectionEntityId === unitEntityId(aiUnit.instanceId)}
                    targetable={targetableIds.has(unitEntityId(aiUnit.instanceId))}
                    badges={game.currentPlayer === "ai" && aiUnit.summonedOnTurn === game.turnNumber ? ["Summoning sickness"] : []}
                    onClick={() => onLaneClick("ai", lane)}
                  />
                ) : (
                  <div className="lane-slot__empty">Open enemy lane</div>
                )}
              </div>

              <div className="lane-column__label">{["Left", "Center", "Right"][lane]} lane</div>

              <div
                className={`lane-slot${laneIsSelectable ? " lane-slot--playable" : ""}`}
                onClick={() => onLaneClick("player", lane)}
                role="presentation"
              >
                {playerUnit ? (
                  <BoardUnit
                    unit={playerUnit}
                    selected={inspectionEntityId === unitEntityId(playerUnit.instanceId)}
                    targetable={targetableIds.has(unitEntityId(playerUnit.instanceId))}
                    badges={
                      game.currentPlayer === "player" && playerUnit.summonedOnTurn === game.turnNumber ? ["Summoning sickness"] : []
                    }
                    onClick={() => onLaneClick("player", lane)}
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
        selected={inspectionEntityId === heroEntityId("player")}
        onClick={() => onHeroClick("player")}
      />

      <div className="controls-row" data-surface="controls">
        <button
          type="button"
          className="primary-button"
          onClick={onPlaySelectedSpell}
          disabled={!selectedCard || selectedCard.kind !== "spell" || !preview || preview.requiresTarget || !preview.playable}
        >
          Play Selected Spell
        </button>
        <button type="button" className="secondary-button" onClick={onClearSelection} disabled={selectedHandIndex == null}>
          Clear Selection
        </button>
        <button type="button" className="secondary-button" onClick={onEndTurn} disabled={game.currentPlayer !== "player" || Boolean(game.winner)}>
          End Turn & Resolve Combat
        </button>
      </div>

      <CombatForecastPanel forecasts={combatForecast} />

      <section className="hand-panel" data-surface="hand">
        <div className="section-heading">
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
              onClick={() => onHandCardClick(handIndex)}
              label={selectedHandIndex === handIndex ? "Selected" : undefined}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
