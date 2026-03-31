import type { Ability, Effect, Status, TargetFilter, TargetSpec, Trigger } from "./types";

const chosenSelectors = new Set(["chosenAlly", "chosenEnemy"]);

export const target = {
  self: (filters?: TargetFilter[]): TargetSpec => ({ selector: "self", filters }),
  chosenAlly: (filters?: TargetFilter[]): TargetSpec => ({ selector: "chosenAlly", filters }),
  chosenEnemy: (filters?: TargetFilter[]): TargetSpec => ({ selector: "chosenEnemy", filters }),
  randomEnemy: (filters?: TargetFilter[]): TargetSpec => ({ selector: "randomEnemy", filters }),
  adjacentAlly: (filters?: TargetFilter[]): TargetSpec => ({ selector: "adjacentAlly", filters }),
  opposingUnitThisLane: (filters?: TargetFilter[]): TargetSpec => ({
    selector: "opposingUnitThisLane",
    filters
  }),
  allAllies: (filters?: TargetFilter[]): TargetSpec => ({ selector: "allAllies", filters }),
  allEnemies: (filters?: TargetFilter[]): TargetSpec => ({ selector: "allEnemies", filters }),
  friendlyHero: (): TargetSpec => ({ selector: "friendlyHero" }),
  enemyHero: (): TargetSpec => ({ selector: "enemyHero" })
};

export const effect = {
  damage: (amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "dealDamage",
    amount,
    target: targetSpec
  }),
  heal: (amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "heal",
    amount,
    target: targetSpec
  }),
  draw: (amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "drawCards",
    amount,
    target: targetSpec
  }),
  summon: (tokenCardId: string, amount = 1, position: "firstEmpty" | "sameLane" = "firstEmpty"): Effect => ({
    kind: "summonToken",
    tokenCardId,
    amount,
    position
  }),
  status: (status: Status, amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "grantStatus",
    status,
    amount,
    target: targetSpec
  }),
  attack: (amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "modifyAttack",
    amount,
    target: targetSpec
  }),
  health: (amount: number, targetSpec: TargetSpec): Effect => ({
    kind: "modifyHealth",
    amount,
    target: targetSpec
  }),
  destroy: (targetSpec: TargetSpec): Effect => ({
    kind: "destroy",
    target: targetSpec
  })
};

export const ability = (trigger: Trigger, ...effects: Effect[]): Ability => ({
  trigger,
  effects
});

export function isChosenTargetSpec(targetSpec: TargetSpec): boolean {
  return chosenSelectors.has(targetSpec.selector);
}

export function getCardChosenTargetSpec(abilities: Ability[], trigger: Trigger = "onPlay"): TargetSpec | null {
  for (const entry of abilities) {
    if (entry.trigger !== trigger) {
      continue;
    }

    for (const item of entry.effects) {
      if ("target" in item && item.target && isChosenTargetSpec(item.target)) {
        return item.target;
      }
    }
  }

  return null;
}
