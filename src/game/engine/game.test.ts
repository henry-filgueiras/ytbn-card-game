import { describe, expect, it } from "vitest";
import { getCardById } from "../../data/cards";
import { renderCanonicalCardRules, renderCardRules } from "../text";
import type { GameState, PlayerId, UnitInstance } from "../types";
import { createGame, endTurn, getCombatForecast, getPlayPreview, heroEntityId, playCard, shouldAutoEndTurn, unitEntityId } from "./index";

function freshState(seed = 7): GameState {
  const state = createGame(seed);

  state.log = [];
  state.currentPlayer = "player";
  state.turnNumber = 4;
  state.cardsPlayedThisTurn = 0;
  state.winner = null;

  for (const playerId of ["player", "ai"] as const) {
    const player = state.players[playerId];
    player.deck = [];
    player.hand = [];
    player.discard = [];
    player.energy = 10;
    player.maxEnergy = 10;
    player.hero.health = 20;
    player.hero.maxHealth = 20;
    player.lanes = [null, null, null];
  }

  return state;
}

function unit(cardId: string, ownerId: PlayerId, lane: number, overrides: Partial<UnitInstance> = {}): UnitInstance {
  const card = getCardById(cardId);

  if (card.kind !== "unit") {
    throw new Error(`${cardId} is not a unit`);
  }

  return {
    instanceId: overrides.instanceId ?? `${ownerId}-${lane}-${cardId}`,
    cardId,
    name: card.name,
    ownerId,
    lane,
    attack: overrides.attack ?? card.attack,
    health: overrides.health ?? card.health,
    maxHealth: overrides.maxHealth ?? card.health,
    statuses: overrides.statuses ?? {},
    summonedOnTurn: overrides.summonedOnTurn ?? 0
  };
}

describe("semantic card game engine", () => {
  it("filters chosen damaged enemy unit targets correctly", () => {
    const state = freshState();
    const damagedEnemy = unit("mirror-squire", "ai", 0, { health: 2, maxHealth: 5, instanceId: "damaged-enemy" });
    const healthyEnemy = unit("ember-initiate", "ai", 1, { health: 1, maxHealth: 1, instanceId: "healthy-enemy" });

    state.players.player.hand = ["sever-the-weak"];
    state.players.ai.lanes[0] = damagedEnemy;
    state.players.ai.lanes[1] = healthyEnemy;

    const preview = getPlayPreview(state, "player", 0);

    expect(preview.requiresTarget).toBe(true);
    expect(preview.targetOptions).toEqual([unitEntityId("damaged-enemy")]);
  });

  it("resolves on-play damage from structured ability data", () => {
    const state = freshState();
    state.players.player.hand = ["spark-volley"];

    const next = playCard(state, "player", {
      handIndex: 0,
      targetId: heroEntityId("ai")
    });

    expect(next.players.ai.hero.health).toBe(18);
    expect(next.players.player.hand).toHaveLength(0);
    expect(next.players.player.discard).toContain("spark-volley");
  });

  it("handles death and on-death draw triggers", () => {
    const state = freshState();
    const graveTutor = unit("grave-tutor", "ai", 0, {
      health: 1,
      maxHealth: 4,
      instanceId: "grave-tutor-target"
    });

    state.players.player.hand = ["spark-volley"];
    state.players.ai.lanes[0] = graveTutor;
    state.players.ai.deck = ["ember-initiate", "crownfire"];

    const next = playCard(state, "player", {
      handIndex: 0,
      targetId: unitEntityId("grave-tutor-target")
    });

    expect(next.players.ai.lanes[0]).toBeNull();
    expect(next.players.ai.hand).toHaveLength(2);
    expect(next.players.ai.discard).toContain("grave-tutor");
  });

  it("applies poisoned damage at the start of the controller's turn", () => {
    const state = freshState();
    state.currentPlayer = "ai";
    state.players.player.lanes[0] = unit("field-medic", "player", 0, {
      health: 3,
      maxHealth: 3,
      statuses: { poisoned: 2 },
      instanceId: "poisoned-ally"
    });

    const next = endTurn(state);
    const poisonedUnit = next.players.player.lanes[0];

    expect(next.currentPlayer).toBe("player");
    expect(poisonedUnit?.health).toBe(1);
  });

  it("renders ability text from the semantic schema", () => {
    const card = getCardById("blaze-archivist");
    const rules = renderCardRules(card);

    expect(rules[0]).toContain("On play:");
    expect(rules[0]).toContain("Deal 1 damage to chosen enemy.");
    expect(rules[0]).toContain("Draw 1 card.");
  });

  it("does not auto-end a turn with no actions before a card has been played", () => {
    const state = freshState();
    state.players.player.hand = [];
    state.cardsPlayedThisTurn = 0;

    expect(shouldAutoEndTurn(state, "player")).toBe(false);
  });

  it("auto-ends once the player has played a card and no further actions remain", () => {
    const state = freshState();
    state.players.player.hand = ["crownfire"];

    const afterPlay = playCard(state, "player", {
      handIndex: 0
    });

    expect(afterPlay.cardsPlayedThisTurn).toBe(1);
    expect(shouldAutoEndTurn(afterPlay, "player")).toBe(true);
  });

  it("describes upcoming combat including summoning sickness", () => {
    const state = freshState();
    state.players.player.lanes[0] = unit("cinder-scout", "player", 0, {
      instanceId: "new-scout",
      summonedOnTurn: state.turnNumber
    });
    state.players.player.lanes[1] = unit("slag-titan", "player", 1, {
      instanceId: "ready-titan",
      summonedOnTurn: state.turnNumber - 1
    });
    state.players.ai.lanes[1] = unit("field-medic", "ai", 1, {
      instanceId: "blocking-medic",
      health: 3,
      maxHealth: 3
    });

    const forecast = getCombatForecast(state, "player");

    expect(forecast[0].kind).toBe("summoningSick");
    expect(forecast[1].kind).toBe("duel");
    expect(forecast[1].defenderWillDie).toBe(true);
  });

  it("renders canonical designer text with term overrides", () => {
    const card = getCardById("cinder-scout");
    const rules = renderCanonicalCardRules(card, {
      triggers: { onAttack: "strike step" },
      statuses: { burning: "Scorch" },
      selectors: { opposingUnitThisLane: "rival in lane" }
    });

    expect(rules[0]).toContain("strike step ->");
    expect(rules[0]).toContain("Scorch 1");
    expect(rules[0]).toContain("rival in lane");
  });
});
