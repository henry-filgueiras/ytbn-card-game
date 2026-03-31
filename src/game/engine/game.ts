import { getCardChosenTargetSpec } from "../abilities";
import { getCardById } from "../../data/cards";
import { getDeckById } from "../../data/decks";
import { renderAbility } from "../text";
import type {
  Ability,
  CardDefinition,
  GameState,
  PlayCardParams,
  PlayPreview,
  PlayerId,
  ResolutionContext,
  Status,
  UnitCardDefinition,
  UnitInstance,
  Winner
} from "../types";
import { collectTargetOptions, resolveTargets } from "./targeting";
import {
  cloneState,
  findFirstEmptyLane,
  getResolvedEntity,
  getUnitAtLane,
  laneLabel,
  nextRandom,
  opponentOf,
  playerLabel,
  pushLog,
  unitEntityId
} from "./utils";

const MAX_ENERGY = 8;
const OPENING_HAND = 4;
const LANE_COUNT = 3;
const HERO_HEALTH = 20;

function shuffleWithState(state: GameState, items: string[]): string[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function createEmptyPlayer(id: PlayerId, deck: string[]) {
  return {
    id,
    deck,
    hand: [] as string[],
    discard: [] as string[],
    hero: {
      health: HERO_HEALTH,
      maxHealth: HERO_HEALTH
    },
    energy: 0,
    maxEnergy: 0,
    lanes: Array.from({ length: LANE_COUNT }, () => null)
  };
}

function makeBaseState(seed: number, playerDeckId: string, aiDeckId: string): GameState {
  const state: GameState = {
    currentPlayer: "player",
    turnNumber: 0,
    cardsPlayedThisTurn: 0,
    winner: null,
    log: [],
    rngState: seed >>> 0,
    nextUnitId: 1,
    players: {
      player: createEmptyPlayer("player", []),
      ai: createEmptyPlayer("ai", [])
    }
  };

  state.players.player.deck = shuffleWithState(state, getDeckById(playerDeckId).cards);
  state.players.ai.deck = shuffleWithState(state, getDeckById(aiDeckId).cards);

  return state;
}

function getCardForHand(state: GameState, playerId: PlayerId, handIndex: number): CardDefinition | null {
  const cardId = state.players[playerId].hand[handIndex];
  return cardId ? getCardById(cardId) : null;
}

function updateWinner(state: GameState): void {
  const playerDead = state.players.player.hero.health <= 0;
  const aiDead = state.players.ai.hero.health <= 0;

  let winner: Winner = null;

  if (playerDead && aiDead) {
    winner = "draw";
  } else if (aiDead) {
    winner = "player";
  } else if (playerDead) {
    winner = "ai";
  }

  state.winner = winner;
}

function drawCards(state: GameState, playerId: PlayerId, amount: number, source = "Draw"): void {
  for (let drawIndex = 0; drawIndex < amount; drawIndex += 1) {
    const nextCard = state.players[playerId].deck.shift();

    if (!nextCard) {
      pushLog(state, `${playerLabel(playerId)} has no cards left to draw.`);
      continue;
    }

    state.players[playerId].hand.push(nextCard);
    pushLog(
      state,
      playerId === "player"
        ? `${playerLabel(playerId)} draws ${getCardById(nextCard).name} (${source}).`
        : `${playerLabel(playerId)} draws a card (${source}).`
    );
  }
}

function createUnitFromCard(card: UnitCardDefinition, ownerId: PlayerId, lane: number, turnNumber: number, nextUnitId: number): UnitInstance {
  return {
    instanceId: `u${nextUnitId}`,
    cardId: card.id,
    name: card.name,
    ownerId,
    lane,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    statuses: {},
    summonedOnTurn: turnNumber
  };
}

function triggerAbilitiesForUnit(state: GameState, unitId: string, trigger: Ability["trigger"]): void {
  const source = getResolvedEntity(state, unitId);

  if (!source || source.kind !== "unit" || !source.unit) {
    return;
  }

  const card = getCardById(source.unit.cardId);
  const abilities = card.abilities.filter((ability) => ability.trigger === trigger);

  for (const ability of abilities) {
    resolveAbility(state, ability, {
      sourcePlayerId: source.playerId,
      sourceCard: card,
      sourceLane: source.lane,
      sourceUnitId: source.id
    });

    if (state.winner) {
      return;
    }
  }
}

function damageHero(state: GameState, playerId: PlayerId, amount: number, sourceName: string): void {
  if (amount <= 0) {
    return;
  }

  const hero = state.players[playerId].hero;
  hero.health = Math.max(0, hero.health - amount);
  pushLog(state, `${sourceName} deals ${amount} damage to ${playerId === "player" ? "your hero" : "the enemy hero"}.`);
  updateWinner(state);
}

function damageUnit(state: GameState, entityId: string, amount: number, sourceName: string): void {
  if (amount <= 0) {
    return;
  }

  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return;
  }

  if ((entity.unit.statuses.shielded ?? 0) > 0) {
    entity.unit.statuses.shielded = Math.max(0, (entity.unit.statuses.shielded ?? 0) - 1);
    pushLog(state, `${entity.unit.name} blocks the damage with Shielded.`);
    return;
  }

  entity.unit.health = Math.max(0, entity.unit.health - amount);
  pushLog(state, `${sourceName} deals ${amount} damage to ${entity.unit.name}.`);
}

function healEntity(state: GameState, entityId: string, amount: number, sourceName: string): void {
  if (amount <= 0) {
    return;
  }

  const entity = getResolvedEntity(state, entityId);

  if (!entity) {
    return;
  }

  if (entity.kind === "hero") {
    const hero = state.players[entity.playerId].hero;
    const healedAmount = Math.max(0, Math.min(amount, hero.maxHealth - hero.health));
    hero.health += healedAmount;
    pushLog(state, `${sourceName} restores ${healedAmount} health to ${entity.playerId === "player" ? "your hero" : "the enemy hero"}.`);
    return;
  }

  const healedAmount = Math.max(0, Math.min(amount, entity.unit!.maxHealth - entity.unit!.health));
  entity.unit!.health += healedAmount;
  pushLog(state, `${sourceName} restores ${healedAmount} health to ${entity.unit!.name}.`);
}

function applyStatus(state: GameState, entityId: string, status: Status, amount: number, sourceName: string): void {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return;
  }

  entity.unit.statuses[status] = (entity.unit.statuses[status] ?? 0) + amount;
  pushLog(state, `${sourceName} gives ${status} ${amount} to ${entity.unit.name}.`);
}

function modifyAttack(state: GameState, entityId: string, amount: number, sourceName: string): void {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return;
  }

  entity.unit.attack = Math.max(0, entity.unit.attack + amount);
  pushLog(state, `${sourceName} changes ${entity.unit.name}'s attack by ${amount >= 0 ? "+" : ""}${amount}.`);
}

function modifyHealth(state: GameState, entityId: string, amount: number, sourceName: string): void {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return;
  }

  entity.unit.maxHealth = Math.max(1, entity.unit.maxHealth + amount);
  entity.unit.health = Math.max(1, entity.unit.health + amount);
  pushLog(state, `${sourceName} changes ${entity.unit.name}'s health by ${amount >= 0 ? "+" : ""}${amount}.`);
}

function destroyUnit(state: GameState, entityId: string, sourceName: string): void {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return;
  }

  entity.unit.health = 0;
  pushLog(state, `${sourceName} destroys ${entity.unit.name}.`);
}

function summonToken(state: GameState, context: ResolutionContext, tokenCardId: string, amount: number, position: "firstEmpty" | "sameLane"): void {
  const tokenCard = getCardById(tokenCardId);

  if (tokenCard.kind !== "unit") {
    return;
  }

  for (let summonIndex = 0; summonIndex < amount; summonIndex += 1) {
    const lane =
      position === "sameLane" && context.sourceLane != null && !getUnitAtLane(state, context.sourcePlayerId, context.sourceLane)
        ? context.sourceLane
        : findFirstEmptyLane(state, context.sourcePlayerId);

    if (lane == null) {
      pushLog(state, `${context.sourceCard.name} has no empty lane for ${tokenCard.name}.`);
      return;
    }

    const unit = createUnitFromCard(tokenCard, context.sourcePlayerId, lane, state.turnNumber, state.nextUnitId);
    state.nextUnitId += 1;
    state.players[context.sourcePlayerId].lanes[lane] = unit;
    pushLog(state, `${context.sourceCard.name} summons ${unit.name} into the ${laneLabel(lane)} lane.`);
  }
}

function handleDeaths(state: GameState): void {
  while (!state.winner) {
    const deadUnits: UnitInstance[] = [];

    for (const playerId of ["player", "ai"] as const) {
      const player = state.players[playerId];

      for (let lane = 0; lane < player.lanes.length; lane += 1) {
        const unit = player.lanes[lane];

        if (unit && unit.health <= 0) {
          deadUnits.push({ ...unit, statuses: { ...unit.statuses } });
          player.lanes[lane] = null;
          player.discard.push(unit.cardId);
          pushLog(state, `${unit.name} falls in the ${laneLabel(lane)} lane.`);
        }
      }
    }

    if (deadUnits.length === 0) {
      return;
    }

    for (const snapshot of deadUnits) {
      const card = getCardById(snapshot.cardId);
      const abilities = card.abilities.filter((ability) => ability.trigger === "onDeath");

      for (const ability of abilities) {
        resolveAbility(state, ability, {
          sourcePlayerId: snapshot.ownerId,
          sourceCard: card,
          sourceLane: snapshot.lane,
          sourceUnitSnapshot: snapshot
        });

        if (state.winner) {
          return;
        }
      }
    }

    updateWinner(state);
  }
}

function resolveEffect(state: GameState, effect: Ability["effects"][number], context: ResolutionContext): void {
  const sourceName = context.sourceCard.name;

  switch (effect.kind) {
    case "dealDamage": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        const target = getResolvedEntity(state, targetId);
        if (!target) {
          continue;
        }

        if (target.kind === "hero") {
          damageHero(state, target.playerId, effect.amount, sourceName);
        } else {
          damageUnit(state, targetId, effect.amount, sourceName);
        }
      }

      handleDeaths(state);
      return;
    }
    case "heal": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        healEntity(state, targetId, effect.amount, sourceName);
      }

      return;
    }
    case "drawCards": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        const target = getResolvedEntity(state, targetId);

        if (!target) {
          continue;
        }

        drawCards(state, target.playerId, effect.amount, sourceName);
      }

      return;
    }
    case "summonToken":
      summonToken(state, context, effect.tokenCardId, effect.amount, effect.position);
      return;
    case "grantStatus": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        applyStatus(state, targetId, effect.status, effect.amount, sourceName);
      }

      return;
    }
    case "modifyAttack": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        modifyAttack(state, targetId, effect.amount, sourceName);
      }

      return;
    }
    case "modifyHealth": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        modifyHealth(state, targetId, effect.amount, sourceName);
      }

      return;
    }
    case "destroy": {
      const targets = resolveTargets(state, context, effect.target);

      for (const targetId of targets) {
        destroyUnit(state, targetId, sourceName);
      }

      handleDeaths(state);
      return;
    }
    default:
      return;
  }
}

function resolveAbility(state: GameState, ability: Ability, context: ResolutionContext): void {
  pushLog(state, `${context.sourceCard.name}: ${renderAbility(ability)}`);

  for (const effect of ability.effects) {
    resolveEffect(state, effect, context);

    if (state.winner) {
      return;
    }
  }
}

function beginTurn(state: GameState, playerId: PlayerId): void {
  const player = state.players[playerId];
  state.currentPlayer = playerId;
  state.cardsPlayedThisTurn = 0;
  player.maxEnergy = Math.min(MAX_ENERGY, player.maxEnergy + 1);
  player.energy = player.maxEnergy;
  pushLog(state, `${playerLabel(playerId)} begins turn ${state.turnNumber}.`);
  drawCards(state, playerId, 1, "turn draw");

  for (const unit of player.lanes) {
    if (!unit) {
      continue;
    }

    triggerAbilitiesForUnit(state, unitEntityId(unit.instanceId), "startOfTurn");

    if (state.winner) {
      return;
    }
  }

  for (const unit of player.lanes) {
    if (!unit || (unit.statuses.poisoned ?? 0) <= 0) {
      continue;
    }

    damageUnit(state, unitEntityId(unit.instanceId), unit.statuses.poisoned ?? 0, "Poison");
  }

  handleDeaths(state);
}

function runAutoCombat(state: GameState, playerId: PlayerId): void {
  const enemyId = opponentOf(playerId);
  const friendlyLanes = state.players[playerId].lanes;

  for (let lane = 0; lane < friendlyLanes.length; lane += 1) {
    const attacker = friendlyLanes[lane];

    if (!attacker) {
      continue;
    }

    const attackerEntityId = unitEntityId(attacker.instanceId);
    const refreshedAttacker = getResolvedEntity(state, attackerEntityId);

    if (!refreshedAttacker || refreshedAttacker.kind !== "unit" || !refreshedAttacker.unit) {
      continue;
    }

    if (refreshedAttacker.unit.summonedOnTurn === state.turnNumber) {
      pushLog(state, `${refreshedAttacker.unit.name} cannot attack on the turn it entered play.`);
      continue;
    }

    if ((refreshedAttacker.unit.statuses.stunned ?? 0) > 0) {
      refreshedAttacker.unit.statuses.stunned = Math.max(0, (refreshedAttacker.unit.statuses.stunned ?? 0) - 1);
      pushLog(state, `${refreshedAttacker.unit.name} is stunned and misses its attack.`);
      continue;
    }

    triggerAbilitiesForUnit(state, attackerEntityId, "onAttack");

    if (state.winner) {
      return;
    }

    const currentAttacker = getResolvedEntity(state, attackerEntityId);

    if (!currentAttacker || currentAttacker.kind !== "unit" || !currentAttacker.unit) {
      continue;
    }

    const targetUnit = getUnitAtLane(state, enemyId, lane);

    if (targetUnit) {
      const targetEntityId = unitEntityId(targetUnit.instanceId);
      const attackerDamage = currentAttacker.unit.attack;
      const defenderDamage = targetUnit.attack;
      damageUnit(state, targetEntityId, attackerDamage, currentAttacker.unit.name);
      damageUnit(state, attackerEntityId, defenderDamage, targetUnit.name);
      handleDeaths(state);
      continue;
    }

    damageHero(state, enemyId, currentAttacker.unit.attack, currentAttacker.unit.name);

    if (state.winner) {
      return;
    }
  }
}

export function createGame(seed = Date.now(), playerDeckId = "emberRush", aiDeckId = "verdantWard"): GameState {
  const state = makeBaseState(seed, playerDeckId, aiDeckId);

  drawCards(state, "player", OPENING_HAND, "opening hand");
  drawCards(state, "ai", OPENING_HAND, "opening hand");

  state.turnNumber = 1;
  beginTurn(state, "player");
  return state;
}

export function hasAnyPlayableActions(state: GameState, playerId: PlayerId): boolean {
  if (state.currentPlayer !== playerId || state.winner) {
    return false;
  }

  for (let handIndex = 0; handIndex < state.players[playerId].hand.length; handIndex += 1) {
    const card = getCardForHand(state, playerId, handIndex);

    if (!card) {
      continue;
    }

    const preview = getPlayPreview(state, playerId, handIndex);

    if (!preview.playable) {
      continue;
    }

    if (card.kind !== "unit") {
      return !preview.requiresTarget || preview.targetOptions.length > 0;
    }

    for (const lane of preview.laneOptions) {
      const lanePreview = getPlayPreview(state, playerId, handIndex, lane);

      if (!lanePreview.playable) {
        continue;
      }

      if (!lanePreview.requiresTarget || lanePreview.targetOptions.length > 0) {
        return true;
      }
    }
  }

  return false;
}

export function shouldAutoEndTurn(state: GameState, playerId: PlayerId): boolean {
  return (
    state.currentPlayer === playerId &&
    !state.winner &&
    state.cardsPlayedThisTurn > 0 &&
    !hasAnyPlayableActions(state, playerId)
  );
}

export function getPlayPreview(state: GameState, playerId: PlayerId, handIndex: number, lane?: number): PlayPreview {
  const player = state.players[playerId];
  const card = getCardForHand(state, playerId, handIndex);

  if (!card || state.currentPlayer !== playerId || state.winner || card.cost > player.energy) {
    return {
      requiresLane: card?.kind === "unit",
      laneOptions: [],
      requiresTarget: false,
      targetOptions: [],
      chosenTargetSpec: null,
      playable: false
    };
  }

  const chosenTargetSpec = getCardChosenTargetSpec(card.abilities);
  const requiresLane = card.kind === "unit";
  const laneOptions =
    card.kind === "unit"
      ? player.lanes
          .map((occupant, candidateLane) => (!occupant ? candidateLane : null))
          .filter((candidateLane): candidateLane is number => candidateLane != null)
          .filter((candidateLane) => {
            if (!chosenTargetSpec) {
              return true;
            }

            return (
              collectTargetOptions(
                state,
                {
                  sourcePlayerId: playerId,
                  sourceCard: card,
                  sourceLane: candidateLane
                },
                chosenTargetSpec
              ).length > 0
            );
          })
      : [];

  const context: ResolutionContext = {
    sourcePlayerId: playerId,
    sourceCard: card,
    sourceLane: lane
  };

  const targetOptions =
    chosenTargetSpec && (!requiresLane || lane != null) ? collectTargetOptions(state, context, chosenTargetSpec) : [];

  const playable =
    (!requiresLane || laneOptions.length > 0) &&
    (!chosenTargetSpec ||
      (requiresLane ? (lane == null ? laneOptions.length > 0 : targetOptions.length > 0) : targetOptions.length > 0));

  return {
    requiresLane,
    laneOptions,
    requiresTarget: Boolean(chosenTargetSpec),
    targetOptions,
    chosenTargetSpec,
    playable
  };
}

export function playCard(state: GameState, playerId: PlayerId, params: PlayCardParams): GameState {
  const preview = getPlayPreview(state, playerId, params.handIndex, params.lane);
  const card = getCardForHand(state, playerId, params.handIndex);

  if (!card || !preview.playable || state.currentPlayer !== playerId || state.winner) {
    return state;
  }

  if (card.kind === "unit" && (params.lane == null || !preview.laneOptions.includes(params.lane))) {
    return state;
  }

  if (preview.requiresTarget && !params.targetId) {
    return state;
  }

  if (params.targetId && preview.requiresTarget && !preview.targetOptions.includes(params.targetId)) {
    return state;
  }

  const next = cloneState(state);
  const player = next.players[playerId];
  const cardId = player.hand[params.handIndex];
  const resolvedCard = getCardById(cardId);
  player.hand.splice(params.handIndex, 1);
  player.energy -= resolvedCard.cost;
  next.cardsPlayedThisTurn += 1;

  let sourceUnitId: string | undefined;

  if (resolvedCard.kind === "unit") {
    const unit = createUnitFromCard(resolvedCard, playerId, params.lane!, next.turnNumber, next.nextUnitId);
    next.nextUnitId += 1;
    next.players[playerId].lanes[params.lane!] = unit;
    sourceUnitId = unitEntityId(unit.instanceId);
    pushLog(next, `${playerLabel(playerId)} deploys ${resolvedCard.name} into the ${laneLabel(params.lane!)} lane.`);
  } else {
    pushLog(next, `${playerLabel(playerId)} casts ${resolvedCard.name}.`);
  }

  const context: ResolutionContext = {
    sourcePlayerId: playerId,
    sourceCard: resolvedCard,
    sourceLane: params.lane,
    sourceUnitId,
    chosenTargetId: params.targetId
  };

  for (const ability of resolvedCard.abilities.filter((ability) => ability.trigger === "onPlay")) {
    resolveAbility(next, ability, context);

    if (next.winner) {
      break;
    }
  }

  if (resolvedCard.kind === "spell") {
    next.players[playerId].discard.push(resolvedCard.id);
  }

  handleDeaths(next);
  updateWinner(next);
  return next;
}

export function endTurn(state: GameState): GameState {
  if (state.winner) {
    return state;
  }

  const next = cloneState(state);
  const currentPlayerId = next.currentPlayer;
  const currentPlayer = next.players[currentPlayerId];

  for (const unit of currentPlayer.lanes) {
    if (!unit) {
      continue;
    }

    triggerAbilitiesForUnit(next, unitEntityId(unit.instanceId), "endOfTurn");

    if (next.winner) {
      return next;
    }
  }

  for (const unit of currentPlayer.lanes) {
    if (!unit || (unit.statuses.burning ?? 0) <= 0) {
      continue;
    }

    damageUnit(next, unitEntityId(unit.instanceId), unit.statuses.burning ?? 0, "Burning");
  }

  handleDeaths(next);

  if (!next.winner) {
    runAutoCombat(next, currentPlayerId);
  }

  if (next.winner) {
    return next;
  }

  const nextPlayerId = opponentOf(currentPlayerId);
  next.turnNumber += 1;
  beginTurn(next, nextPlayerId);
  return next;
}

export function getBoardCard(state: GameState, entityId: string): CardDefinition | null {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return null;
  }

  return getCardById(entity.unit.cardId);
}

export function getLaneCount(): number {
  return LANE_COUNT;
}
