import type { GameState, ResolutionContext, TargetSpec } from "../types";
import {
  describeEntity,
  getAllUnitEntityIds,
  getResolvedEntity,
  getUnitAtLane,
  heroEntityId,
  nextRandom,
  opponentOf,
  unitEntityId
} from "./utils";

function defaultEntityKinds(targetSpec: TargetSpec): Array<"unit" | "hero"> {
  switch (targetSpec.selector) {
    case "chosenAlly":
    case "chosenEnemy":
      return ["unit", "hero"];
    case "friendlyHero":
    case "enemyHero":
      return ["hero"];
    default:
      return ["unit"];
  }
}

function usesHeroTargets(targetSpec: TargetSpec): boolean {
  if (targetSpec.filters?.includes("hero")) {
    return true;
  }

  if (targetSpec.filters?.includes("unit")) {
    return false;
  }

  return defaultEntityKinds(targetSpec).includes("hero");
}

function usesUnitTargets(targetSpec: TargetSpec): boolean {
  if (targetSpec.filters?.includes("unit")) {
    return true;
  }

  if (targetSpec.filters?.includes("hero")) {
    return false;
  }

  return defaultEntityKinds(targetSpec).includes("unit");
}

function isDamaged(state: GameState, entityId: string): boolean {
  const entity = getResolvedEntity(state, entityId);

  if (!entity) {
    return false;
  }

  if (entity.kind === "hero") {
    const hero = state.players[entity.playerId].hero;
    return hero.health < hero.maxHealth;
  }

  return (entity.unit?.health ?? 0) < (entity.unit?.maxHealth ?? 0);
}

function listUnitsAndMaybeHero(state: GameState, playerId: "player" | "ai", targetSpec: TargetSpec): string[] {
  const results: string[] = [];

  if (usesUnitTargets(targetSpec)) {
    results.push(...getAllUnitEntityIds(state, playerId));
  }

  if (usesHeroTargets(targetSpec)) {
    results.push(heroEntityId(playerId));
  }

  return results;
}

function unique(entityIds: string[]): string[] {
  return [...new Set(entityIds)];
}

function filterCandidates(state: GameState, context: ResolutionContext, targetSpec: TargetSpec, candidateIds: string[]): string[] {
  const filtered = candidateIds.filter((entityId) => {
    const entity = getResolvedEntity(state, entityId);

    if (!entity) {
      return false;
    }

    if ((targetSpec.filters?.includes("unit") ?? false) && entity.kind !== "unit") {
      return false;
    }

    if ((targetSpec.filters?.includes("hero") ?? false) && entity.kind !== "hero") {
      return false;
    }

    if ((targetSpec.filters?.includes("damaged") ?? false) && !isDamaged(state, entityId)) {
      return false;
    }

    if (targetSpec.selector === "chosenAlly" && entity.playerId !== context.sourcePlayerId) {
      return false;
    }

    if (targetSpec.selector === "chosenEnemy" && entity.playerId === context.sourcePlayerId) {
      return false;
    }

    if (targetSpec.selector === "chosenAlly" && context.sourceUnitId && entityId === context.sourceUnitId) {
      return false;
    }

    return true;
  });

  return unique(filtered);
}

function collectTargetCandidates(state: GameState, context: ResolutionContext, targetSpec: TargetSpec): string[] {
  const alliedPlayerId = context.sourcePlayerId;
  const enemyPlayerId = opponentOf(alliedPlayerId);

  switch (targetSpec.selector) {
    case "self":
      return context.sourceUnitId ? [context.sourceUnitId] : [];
    case "chosenAlly":
      return context.chosenTargetId
        ? [context.chosenTargetId]
        : listUnitsAndMaybeHero(state, alliedPlayerId, targetSpec);
    case "chosenEnemy":
      return context.chosenTargetId
        ? [context.chosenTargetId]
        : listUnitsAndMaybeHero(state, enemyPlayerId, targetSpec);
    case "randomEnemy":
      return listUnitsAndMaybeHero(state, enemyPlayerId, {
        ...targetSpec,
        filters: targetSpec.filters?.includes("hero") ? targetSpec.filters : [...(targetSpec.filters ?? []), "unit"]
      });
    case "adjacentAlly": {
      if (context.sourceLane == null) {
        return [];
      }

      const targets = [context.sourceLane - 1, context.sourceLane + 1]
        .filter((lane) => lane >= 0 && lane < state.players[alliedPlayerId].lanes.length)
        .map((lane) => getUnitAtLane(state, alliedPlayerId, lane))
        .flatMap((unit) => (unit ? [unitEntityId(unit.instanceId)] : []));

      return targets;
    }
    case "opposingUnitThisLane": {
      if (context.sourceLane == null) {
        return [];
      }

      const opposingUnit = getUnitAtLane(state, enemyPlayerId, context.sourceLane);
      return opposingUnit ? [unitEntityId(opposingUnit.instanceId)] : [];
    }
    case "allAllies":
      return listUnitsAndMaybeHero(state, alliedPlayerId, targetSpec);
    case "allEnemies":
      return listUnitsAndMaybeHero(state, enemyPlayerId, targetSpec);
    case "friendlyHero":
      return [heroEntityId(alliedPlayerId)];
    case "enemyHero":
      return [heroEntityId(enemyPlayerId)];
    default:
      return [];
  }
}

export function collectTargetOptions(state: GameState, context: ResolutionContext, targetSpec: TargetSpec): string[] {
  const candidates = collectTargetCandidates(state, context, targetSpec);
  return filterCandidates(state, context, targetSpec, candidates);
}

export function resolveTargets(state: GameState, context: ResolutionContext, targetSpec: TargetSpec): string[] {
  const candidates = collectTargetOptions(state, context, targetSpec);

  if (targetSpec.selector !== "randomEnemy") {
    return candidates;
  }

  if (candidates.length === 0) {
    return [];
  }

  const index = Math.floor(nextRandom(state) * candidates.length);
  return [candidates[index]];
}

export function describeTargets(state: GameState, targetIds: string[]): string {
  if (targetIds.length === 0) {
    return "no target";
  }

  return targetIds.map((targetId) => describeEntity(state, targetId)).join(", ");
}
