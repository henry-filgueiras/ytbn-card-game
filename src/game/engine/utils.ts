import type { GameState, PlayerId, UnitInstance } from "../types";

const MAX_LOG_ENTRIES = 80;

export interface ResolvedEntity {
  id: string;
  kind: "hero" | "unit";
  playerId: PlayerId;
  unit?: UnitInstance;
  lane?: number;
}

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "player" ? "ai" : "player";
}

export function heroEntityId(playerId: PlayerId): string {
  return `hero:${playerId}`;
}

export function unitEntityId(instanceId: string): string {
  return `unit:${instanceId}`;
}

export function isHeroEntityId(entityId: string): boolean {
  return entityId.startsWith("hero:");
}

export function playerLabel(playerId: PlayerId): string {
  return playerId === "player" ? "You" : "AI";
}

export function laneLabel(lane: number): string {
  return ["left", "center", "right"][lane] ?? `lane ${lane + 1}`;
}

export function pushLog(state: GameState, message: string): void {
  state.log.push(message);

  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log.splice(0, state.log.length - MAX_LOG_ENTRIES);
  }
}

export function nextRandom(state: GameState): number {
  state.rngState = (state.rngState * 1664525 + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

export function getResolvedEntity(state: GameState, entityId: string): ResolvedEntity | null {
  if (isHeroEntityId(entityId)) {
    const playerId = entityId.slice(5) as PlayerId;

    if (!(playerId in state.players)) {
      return null;
    }

    return {
      id: entityId,
      kind: "hero",
      playerId
    };
  }

  if (!entityId.startsWith("unit:")) {
    return null;
  }

  const instanceId = entityId.slice(5);

  for (const playerId of ["player", "ai"] as const) {
    const player = state.players[playerId];

    for (let lane = 0; lane < player.lanes.length; lane += 1) {
      const unit = player.lanes[lane];

      if (unit?.instanceId === instanceId) {
        return {
          id: entityId,
          kind: "unit",
          playerId,
          unit,
          lane
        };
      }
    }
  }

  return null;
}

export function getUnitAtLane(state: GameState, playerId: PlayerId, lane: number): UnitInstance | null {
  return state.players[playerId].lanes[lane] ?? null;
}

export function getAllUnitEntityIds(state: GameState, playerId: PlayerId): string[] {
  return state.players[playerId].lanes.flatMap((unit) => (unit ? [unitEntityId(unit.instanceId)] : []));
}

export function describeEntity(state: GameState, entityId: string): string {
  const entity = getResolvedEntity(state, entityId);

  if (!entity) {
    return "Unknown target";
  }

  if (entity.kind === "hero") {
    return entity.playerId === "player" ? "your hero" : "the enemy hero";
  }

  return entity.unit?.name ?? "unit";
}

export function findFirstEmptyLane(state: GameState, playerId: PlayerId): number | null {
  const lanes = state.players[playerId].lanes;

  for (let lane = 0; lane < lanes.length; lane += 1) {
    if (!lanes[lane]) {
      return lane;
    }
  }

  return null;
}
