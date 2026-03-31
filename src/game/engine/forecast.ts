import type { CombatForecast, GameState, PlayerId, UnitInstance } from "../types";
import { getUnitAtLane, opponentOf, unitEntityId } from "./utils";

function getPreventedDamage(target: UnitInstance, incomingDamage: number): number {
  if (incomingDamage <= 0) {
    return 0;
  }

  return (target.statuses.shielded ?? 0) > 0 ? 0 : incomingDamage;
}

function getShieldNote(unit: UnitInstance): string | undefined {
  return (unit.statuses.shielded ?? 0) > 0 ? `${unit.name} will absorb the next hit with Shielded.` : undefined;
}

export function getCombatForecast(state: GameState, playerId: PlayerId): CombatForecast[] {
  const enemyId = opponentOf(playerId);
  const forecasts: CombatForecast[] = [];

  for (let lane = 0; lane < state.players[playerId].lanes.length; lane += 1) {
    const attacker = state.players[playerId].lanes[lane];

    if (!attacker) {
      forecasts.push({
        lane,
        kind: "empty",
        summary: "No unit will attack from this lane."
      });
      continue;
    }

    const attackerId = unitEntityId(attacker.instanceId);

    if (attacker.summonedOnTurn === state.turnNumber && attacker.ownerId === playerId) {
      forecasts.push({
        lane,
        kind: "summoningSick",
        attackerId,
        attackerName: attacker.name,
        summary: `${attacker.name} has summoning sickness and will not attack this turn.`
      });
      continue;
    }

    if ((attacker.statuses.stunned ?? 0) > 0) {
      forecasts.push({
        lane,
        kind: "stunned",
        attackerId,
        attackerName: attacker.name,
        summary: `${attacker.name} is stunned and will skip combat.`,
        note: "The stun stack is removed when the attack is skipped."
      });
      continue;
    }

    const defender = getUnitAtLane(state, enemyId, lane);

    if (!defender) {
      forecasts.push({
        lane,
        kind: "hero",
        attackerId,
        attackerName: attacker.name,
        summary: `${attacker.name} will hit the enemy hero for ${attacker.attack}.`
      });
      continue;
    }

    const defenderId = unitEntityId(defender.instanceId);
    const damageToDefender = getPreventedDamage(defender, attacker.attack);
    const damageToAttacker = getPreventedDamage(attacker, defender.attack);
    const defenderWillDie = damageToDefender >= defender.health;
    const attackerWillDie = damageToAttacker >= attacker.health;
    const notes = [getShieldNote(attacker), getShieldNote(defender)].filter(Boolean).join(" ");

    forecasts.push({
      lane,
      kind: "duel",
      attackerId,
      defenderId,
      attackerName: attacker.name,
      defenderName: defender.name,
      damageToDefender,
      damageToAttacker,
      attackerWillDie,
      defenderWillDie,
      summary: `${attacker.name} deals ${damageToDefender} to ${defender.name} and takes ${damageToAttacker} back.`,
      note: notes || undefined
    });
  }

  return forecasts;
}
