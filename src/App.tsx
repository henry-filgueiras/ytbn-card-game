import { useEffect, useMemo, useState } from "react";
import { getCardById } from "./data/cards";
import { getDeckById } from "./data/decks";
import {
  createGame,
  endTurn,
  getBoardCard,
  getCombatForecast,
  getPlayPreview,
  heroEntityId,
  playCard,
  runAiTurn,
  shouldAutoEndTurn,
  unitEntityId
} from "./game/engine";
import { GAME_MODES, getGameModeById, type GameModeId } from "./game/modes";
import { renderTarget } from "./game/text";
import { AppHeader } from "./ui/AppHeader";
import { DuelBoard } from "./ui/DuelBoard";
import { DuelSidebar } from "./ui/DuelSidebar";
import { LandingScreen } from "./ui/LandingScreen";
import { ModeSandboxView } from "./ui/ModeSandboxView";

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
  const [activeModeId, setActiveModeId] = useState<GameModeId | null>(null);
  const [game, setGame] = useState(() => createGame());
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [inspection, setInspection] = useState<InspectSelection>({});

  const activeMode = activeModeId ? getGameModeById(activeModeId) : null;
  const scene = !activeMode ? "landing" : activeMode.id === "duel" ? "duel" : "sandbox";
  const isDuelMode = scene === "duel";
  const playableModeCount = GAME_MODES.filter((mode) => mode.support === "playable").length;

  const selectedCardId =
    isDuelMode && selectedHandIndex != null ? game.players.player.hand[selectedHandIndex] ?? undefined : inspection.cardId;
  const selectedCard = selectedCardId ? getCardById(selectedCardId) : null;
  const selectedBoardCard = isDuelMode && inspection.entityId ? getBoardCard(game, inspection.entityId) : null;
  const inspectedCard = selectedCard ?? selectedBoardCard ?? null;

  const preview =
    isDuelMode && selectedHandIndex != null
      ? getPlayPreview(game, "player", selectedHandIndex, selectedLane ?? undefined)
      : null;

  useEffect(() => {
    if (!isDuelMode || selectedHandIndex == null) {
      return;
    }

    const stillExists = selectedHandIndex < game.players.player.hand.length;

    if (!stillExists || game.currentPlayer !== "player" || game.winner) {
      setSelectedHandIndex(null);
      setSelectedLane(null);
    }
  }, [game, isDuelMode, selectedHandIndex]);

  useEffect(() => {
    if (!isDuelMode || game.currentPlayer !== "ai" || game.winner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setGame((current) => runAiTurn(current));
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [game.currentPlayer, game.turnNumber, game.winner, isDuelMode]);

  const targetableIds = useMemo(() => new Set(preview?.targetOptions ?? []), [preview?.targetOptions]);
  const combatForecast = useMemo(() => (isDuelMode ? getCombatForecast(game, game.currentPlayer) : []), [game, isDuelMode]);

  const prompt = useMemo(() => {
    if (!isDuelMode) {
      return activeMode?.modeNote ?? "";
    }

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
  }, [activeMode, game.currentPlayer, game.winner, isDuelMode, preview, selectedCard, selectedLane]);

  function clearSelectionState() {
    setSelectedHandIndex(null);
    setSelectedLane(null);
    setInspection({});
  }

  function openMode(modeId: GameModeId) {
    setActiveModeId(modeId);
    clearSelectionState();

    if (modeId === "duel") {
      setGame(createGame());
    }
  }

  function returnToModeSelect() {
    setActiveModeId(null);
    clearSelectionState();
  }

  function resetMatch() {
    if (!isDuelMode) {
      return;
    }

    setGame(createGame());
    clearSelectionState();
  }

  function commitPlay(options?: { targetId?: string; lane?: number }) {
    if (!isDuelMode || selectedHandIndex == null) {
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
    if (!isDuelMode || game.currentPlayer !== "player" || game.winner) {
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
    if (!isDuelMode) {
      return;
    }

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
    if (!isDuelMode) {
      return;
    }

    const entityId = heroEntityId(playerId);
    setInspection({ entityId });

    if (selectedHandIndex != null && targetableIds.has(entityId)) {
      commitPlay({ targetId: entityId });
    }
  }

  function playSelectedSpell() {
    if (!isDuelMode || !selectedCard || selectedCard.kind !== "spell" || !preview || preview.requiresTarget || !preview.playable) {
      return;
    }

    commitPlay();
  }

  if (!activeMode) {
    return (
      <div className="app-shell" data-scene={scene}>
        <AppHeader
          title="Semantic Arena Lab"
          description="One semantic card language, multiple board topologies. Use the playable duel to test the rules engine, then open the larger modes to explore how the same terms bend under new spatial assumptions."
          badge={`${playableModeCount} live mode · ${GAME_MODES.length - playableModeCount} topology sandboxes`}
          scene="landing"
        />
        <LandingScreen onSelectMode={openMode} />
      </div>
    );
  }

  if (!isDuelMode) {
    return (
      <div className="app-shell" data-scene={scene}>
        <AppHeader
          title={activeMode.name}
          description={activeMode.description}
          badge={`${activeMode.playerCountLabel} · ${activeMode.topologyLabel}`}
          scene="sandbox"
          actions={
            <>
              <button type="button" className="secondary-button" onClick={returnToModeSelect}>
                Change Mode
              </button>
              <button type="button" className="primary-button" onClick={() => openMode("duel")}>
                Jump Into Duel
              </button>
            </>
          }
        />
        <ModeSandboxView mode={activeMode} />
      </div>
    );
  }

  return (
    <div className="app-shell" data-scene={scene}>
      <AppHeader
        title="Semantic Arena Lab"
        description={activeMode.description}
        badge={`Mode: ${activeMode.name} · You: ${getDeckById("emberRush").name} vs AI: ${getDeckById("verdantWard").name}`}
        scene="duel"
        actions={
          <>
            <button type="button" className="secondary-button" onClick={returnToModeSelect}>
              Change Mode
            </button>
            <button type="button" className="primary-button" onClick={resetMatch}>
              New Match
            </button>
          </>
        }
      />

      <main className="layout" data-scene="duel">
        <DuelBoard
          game={game}
          prompt={prompt}
          selectedHandIndex={selectedHandIndex}
          selectedLane={selectedLane}
          selectedCard={selectedCard}
          preview={preview}
          inspectionEntityId={inspection.entityId}
          targetableIds={targetableIds}
          combatForecast={combatForecast}
          onHeroClick={handleHeroClick}
          onLaneClick={handleLaneClick}
          onHandCardClick={handleHandCardClick}
          onPlaySelectedSpell={playSelectedSpell}
          onClearSelection={() => {
            setSelectedHandIndex(null);
            setSelectedLane(null);
          }}
          onEndTurn={() => {
            setSelectedHandIndex(null);
            setSelectedLane(null);
            setGame((current) => endTurn(current));
          }}
        />

        <DuelSidebar inspectedCard={inspectedCard} logEntries={game.log} />
      </main>
    </div>
  );
}
