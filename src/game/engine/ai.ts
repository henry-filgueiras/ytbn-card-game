import { getCardById } from "../../data/cards";
import type { CardDefinition, GameState, PlayerId } from "../types";
import { endTurn, getPlayPreview, playCard } from "./game";
import { getResolvedEntity, opponentOf } from "./utils";

interface CandidatePlay {
  handIndex: number;
  lane?: number;
  targetId?: string;
  score: number;
}

function getUnitValue(entityId: string, state: GameState): number {
  const entity = getResolvedEntity(state, entityId);

  if (!entity || entity.kind !== "unit" || !entity.unit) {
    return 0;
  }

  return entity.unit.attack * 2 + entity.unit.health + entity.unit.maxHealth / 2;
}

function scoreCard(card: CardDefinition): number {
  if (card.kind === "unit") {
    return card.cost * 3 + card.attack * 2 + card.health;
  }

  return card.cost * 4;
}

function evaluateTarget(card: CardDefinition, state: GameState, targetId?: string): number {
  if (!targetId) {
    return scoreCard(card);
  }

  const target = getResolvedEntity(state, targetId);

  if (!target) {
    return -100;
  }

  if (target.kind === "hero") {
    const hero = state.players[target.playerId].hero;
    const enemyBonus = target.playerId === "player" ? 12 : -8;
    const lethalBonus = hero.health <= 3 ? 100 : 0;
    return scoreCard(card) + enemyBonus + lethalBonus;
  }

  const unit = target.unit!;
  const isEnemy = target.playerId === "player";
  const damagedValue = unit.health < unit.maxHealth ? 4 : 0;
  const stunnedValue = unit.statuses.stunned ?? 0;
  const shieldValue = unit.statuses.shielded ?? 0;
  const baseValue = getUnitValue(targetId, state);

  if (isEnemy) {
    return scoreCard(card) + baseValue + damagedValue + shieldValue * 2 - stunnedValue;
  }

  return scoreCard(card) + (unit.maxHealth - unit.health) * 3 + unit.attack + shieldValue;
}

function getCandidatePlays(state: GameState, playerId: PlayerId): CandidatePlay[] {
  const hand = state.players[playerId].hand;
  const results: CandidatePlay[] = [];

  for (let handIndex = 0; handIndex < hand.length; handIndex += 1) {
    const card = getCardById(hand[handIndex]);
    const basePreview = getPlayPreview(state, playerId, handIndex);

    if (!basePreview.playable) {
      continue;
    }

    if (card.kind === "unit") {
      for (const lane of basePreview.laneOptions) {
        const lanePreview = getPlayPreview(state, playerId, handIndex, lane);

        if (!lanePreview.requiresTarget) {
          results.push({
            handIndex,
            lane,
            score: scoreCard(card) + 3
          });
          continue;
        }

        for (const targetId of lanePreview.targetOptions) {
          results.push({
            handIndex,
            lane,
            targetId,
            score: evaluateTarget(card, state, targetId)
          });
        }
      }

      continue;
    }

    if (!basePreview.requiresTarget) {
      results.push({
        handIndex,
        score: scoreCard(card)
      });
      continue;
    }

    for (const targetId of basePreview.targetOptions) {
      results.push({
        handIndex,
        targetId,
        score: evaluateTarget(card, state, targetId)
      });
    }
  }

  return results.sort((left, right) => right.score - left.score);
}

export function runAiTurn(state: GameState): GameState {
  if (state.currentPlayer !== "ai" || state.winner) {
    return state;
  }

  let next = state;
  let iterations = 0;

  while (iterations < 12 && !next.winner) {
    const candidates = getCandidatePlays(next, "ai");

    if (candidates.length === 0) {
      break;
    }

    const best = candidates[0];
    const updated = playCard(next, "ai", {
      handIndex: best.handIndex,
      lane: best.lane,
      targetId: best.targetId
    });

    if (updated === next) {
      break;
    }

    next = updated;
    iterations += 1;
  }

  if (!next.winner && next.currentPlayer === "ai") {
    next = endTurn(next);
  }

  return next;
}
