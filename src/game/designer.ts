import { getAllCards, getCardById } from "../data/cards";
import { renderCanonicalCardRules, renderCardRules, type TermOverrides } from "./text";
import type { Ability, CardDefinition, Effect, Faction, Selector, Status, TargetFilter, TargetSpec, Trigger } from "./types";

export interface CardDraft {
  id: string;
  name: string;
  faction: Faction;
  kind: "unit" | "spell";
  cost: number;
  attack: number;
  health: number;
  abilities: Ability[];
}

export interface SavedCardDesign {
  id: string;
  card: CardDefinition;
  termOverrides: TermOverrides;
}

export interface TermEntry {
  category: "trigger" | "verb" | "selector" | "filter" | "status";
  key: string;
  label: string;
}

export interface EffectBudgetSummary {
  effect: Effect;
  label: string;
  cost: number;
}

export interface AbilityBudgetSummary {
  trigger: Trigger;
  triggerCost: number;
  effects: EffectBudgetSummary[];
  totalCost: number;
}

export interface DraftBudgetSummary {
  maxBudget: number;
  chassisCost: number;
  abilityCost: number;
  totalCost: number;
  remainingBudget: number;
  withinBudget: boolean;
  abilities: AbilityBudgetSummary[];
}

const DEFAULT_ID = "custom-signal";

const TRIGGER_BUDGET_COST: Record<Trigger, number> = {
  onPlay: 1,
  onDeath: 1.5,
  startOfTurn: 1.5,
  endOfTurn: 1.5,
  onAttack: 1
};

const SELECTOR_BUDGET_COST: Record<Selector, number> = {
  self: 0,
  chosenAlly: 1,
  chosenEnemy: 1,
  randomEnemy: 0.5,
  adjacentAlly: 1.5,
  opposingUnitThisLane: 0.5,
  allAllies: 3,
  allEnemies: 3.5,
  friendlyHero: 0.5,
  enemyHero: 0.75
};

const STATUS_BUDGET_COST: Record<Status, number> = {
  poisoned: 1.5,
  stunned: 2,
  shielded: 1.5,
  burning: 1.5
};

export const TRIGGER_OPTIONS: Trigger[] = ["onPlay", "onDeath", "startOfTurn", "endOfTurn", "onAttack"];
export const SELECTOR_OPTIONS: Selector[] = [
  "self",
  "chosenAlly",
  "chosenEnemy",
  "randomEnemy",
  "adjacentAlly",
  "opposingUnitThisLane",
  "allAllies",
  "allEnemies",
  "friendlyHero",
  "enemyHero"
];
export const FILTER_OPTIONS: TargetFilter[] = ["unit", "hero", "damaged"];
export const STATUS_OPTIONS: Status[] = ["poisoned", "stunned", "shielded", "burning"];
export const EFFECT_OPTIONS: Array<Effect["kind"]> = [
  "dealDamage",
  "heal",
  "drawCards",
  "summonToken",
  "grantStatus",
  "modifyAttack",
  "modifyHealth",
  "destroy"
];
export const FACTION_OPTIONS: Faction[] = ["ember", "verdant", "neutral", "token"];

const TERM_LABELS: Record<TermEntry["category"], Record<string, string>> = {
  trigger: {
    onPlay: "On play",
    onDeath: "On death",
    startOfTurn: "Start of turn",
    endOfTurn: "End of turn",
    onAttack: "On attack"
  },
  verb: {
    dealDamage: "Deal damage",
    heal: "Heal",
    drawCards: "Draw cards",
    summonToken: "Summon",
    grantStatus: "Grant status",
    modifyAttack: "Modify attack",
    modifyHealth: "Modify health",
    destroy: "Destroy"
  },
  selector: {
    self: "Self",
    chosenAlly: "Chosen ally",
    chosenEnemy: "Chosen enemy",
    randomEnemy: "Random enemy",
    adjacentAlly: "Adjacent ally",
    opposingUnitThisLane: "Opposing unit in this lane",
    allAllies: "All allies",
    allEnemies: "All enemies",
    friendlyHero: "Friendly hero",
    enemyHero: "Enemy hero"
  },
  filter: {
    unit: "Unit",
    hero: "Hero",
    damaged: "Damaged"
  },
  status: {
    poisoned: "Poisoned",
    stunned: "Stunned",
    shielded: "Shielded",
    burning: "Burning"
  }
};

const TOKEN_OPTIONS = getAllCards()
  .filter((card) => card.kind === "unit")
  .map((card) => ({
    id: card.id,
    label: `${card.name}${card.token ? " (token)" : ""}`
  }));

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || DEFAULT_ID;
}

function roundBudget(value: number): number {
  return Math.round(value * 2) / 2;
}

function getTargetBudgetModifier(target: TargetSpec): number {
  let modifier = SELECTOR_BUDGET_COST[target.selector];

  if (target.filters?.includes("damaged")) {
    modifier -= 0.5;
  }

  if (target.filters?.includes("hero") && !target.filters?.includes("unit")) {
    modifier -= 0.25;
  }

  return Math.max(0, roundBudget(modifier));
}

function getEffectBudgetLabel(effect: Effect): string {
  switch (effect.kind) {
    case "dealDamage":
      return `Deal ${effect.amount} damage`;
    case "heal":
      return `Heal ${effect.amount}`;
    case "drawCards":
      return `Draw ${effect.amount}`;
    case "summonToken":
      return `Summon ${effect.amount} ${getCardById(effect.tokenCardId).name}`;
    case "grantStatus":
      return `Grant ${effect.status} ${effect.amount}`;
    case "modifyAttack":
      return `Modify attack ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
    case "modifyHealth":
      return `Modify health ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
    case "destroy":
      return "Destroy";
    default:
      return "Effect";
  }
}

export function createDefaultEffect(kind: Effect["kind"] = "dealDamage"): Effect {
  switch (kind) {
    case "dealDamage":
      return { kind, amount: 1, target: { selector: "chosenEnemy" } };
    case "heal":
      return { kind, amount: 1, target: { selector: "chosenAlly" } };
    case "drawCards":
      return { kind, amount: 1, target: { selector: "friendlyHero" } };
    case "summonToken":
      return { kind, tokenCardId: "spark-token", amount: 1, position: "firstEmpty" };
    case "grantStatus":
      return { kind, status: "shielded", amount: 1, target: { selector: "chosenAlly", filters: ["unit"] } };
    case "modifyAttack":
      return { kind, amount: 1, target: { selector: "self" } };
    case "modifyHealth":
      return { kind, amount: 1, target: { selector: "self" } };
    case "destroy":
      return { kind, target: { selector: "chosenEnemy", filters: ["unit"] } };
    default:
      return { kind: "dealDamage", amount: 1, target: { selector: "chosenEnemy" } };
  }
}

export function createBlankCardDraft(): CardDraft {
  return {
    id: DEFAULT_ID,
    name: "Custom Signal",
    faction: "neutral",
    kind: "unit",
    cost: 3,
    attack: 2,
    health: 3,
    abilities: [
      {
        trigger: "onPlay",
        effects: [createDefaultEffect("dealDamage")]
      }
    ]
  };
}

export function cardToDraft(card: CardDefinition): CardDraft {
  return {
    id: card.id,
    name: card.name,
    faction: card.faction,
    kind: card.kind,
    cost: card.cost,
    attack: card.kind === "unit" ? card.attack : 0,
    health: card.kind === "unit" ? card.health : 0,
    abilities: structuredClone(card.abilities)
  };
}

export function draftToCard(draft: CardDraft): CardDefinition {
  const base = {
    id: draft.id || slugify(draft.name),
    name: draft.name.trim() || "Untitled Card",
    faction: draft.faction,
    cost: draft.cost,
    abilities: draft.abilities
  };

  if (draft.kind === "spell") {
    return {
      ...base,
      kind: "spell"
    };
  }

  return {
    ...base,
    kind: "unit",
    attack: draft.attack,
    health: draft.health
  };
}

export function ensureDraftId(draft: CardDraft): CardDraft {
  return {
    ...draft,
    id: draft.id.trim() || slugify(draft.name)
  };
}

export function getDraftPreview(draft: CardDraft, terms: TermOverrides) {
  const card = draftToCard(ensureDraftId(draft));

  return {
    card,
    rules: renderCardRules(card, terms),
    canonicalRules: renderCanonicalCardRules(card, terms)
  };
}

export function collectUsedTerms(card: CardDefinition): TermEntry[] {
  const entries = new Map<string, TermEntry>();

  const addEntry = (category: TermEntry["category"], key: string) => {
    entries.set(`${category}:${key}`, {
      category,
      key,
      label: TERM_LABELS[category][key] ?? key
    });
  };

  for (const ability of card.abilities) {
    addEntry("trigger", ability.trigger);

    for (const effect of ability.effects) {
      addEntry("verb", effect.kind);

      if ("target" in effect && effect.target) {
        addEntry("selector", effect.target.selector);

        for (const filter of effect.target.filters ?? []) {
          addEntry("filter", filter);
        }
      }

      if (effect.kind === "grantStatus") {
        addEntry("status", effect.status);
      }
    }
  }

  return [...entries.values()];
}

export function getTokenOptions() {
  return TOKEN_OPTIONS;
}

export function formatBudgetValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function getDraftMaxBudget(draft: CardDraft): number {
  return roundBudget(draft.cost * 2 + (draft.kind === "spell" ? 4 : 3));
}

export function getDraftChassisCost(draft: CardDraft): number {
  if (draft.kind !== "unit") {
    return 0;
  }

  return roundBudget(Math.max(0, draft.attack) + Math.max(1, draft.health) * 0.5);
}

export function getEffectBudgetCost(effect: Effect): number {
  switch (effect.kind) {
    case "dealDamage":
      return roundBudget(1 + effect.amount * 1.5 + getTargetBudgetModifier(effect.target));
    case "heal":
      return roundBudget(0.5 + effect.amount + getTargetBudgetModifier(effect.target));
    case "drawCards":
      return roundBudget(1.5 + effect.amount * 2 + getTargetBudgetModifier(effect.target));
    case "summonToken": {
      const token = getCardById(effect.tokenCardId);
      const tokenBody = token.kind === "unit" ? token.attack + token.health * 0.5 : 1;
      const positionPremium = effect.position === "sameLane" ? 0.5 : 1;
      return roundBudget(1 + effect.amount * tokenBody + positionPremium);
    }
    case "grantStatus":
      return roundBudget(1 + effect.amount * STATUS_BUDGET_COST[effect.status] + getTargetBudgetModifier(effect.target));
    case "modifyAttack":
      return roundBudget(0.5 + Math.abs(effect.amount) + getTargetBudgetModifier(effect.target));
    case "modifyHealth":
      return roundBudget(0.75 + Math.abs(effect.amount) + getTargetBudgetModifier(effect.target));
    case "destroy":
      return roundBudget(5 + getTargetBudgetModifier(effect.target));
    default:
      return 0;
  }
}

export function getAbilityBudgetSummary(ability: Ability): AbilityBudgetSummary {
  const effects = ability.effects.map((effect) => ({
    effect,
    label: getEffectBudgetLabel(effect),
    cost: getEffectBudgetCost(effect)
  }));
  const triggerCost = TRIGGER_BUDGET_COST[ability.trigger];
  const totalCost = roundBudget(triggerCost + effects.reduce((sum, effect) => sum + effect.cost, 0));

  return {
    trigger: ability.trigger,
    triggerCost,
    effects,
    totalCost
  };
}

export function getDraftBudgetSummary(draft: CardDraft): DraftBudgetSummary {
  const abilities = draft.abilities.map((ability) => getAbilityBudgetSummary(ability));
  const maxBudget = getDraftMaxBudget(draft);
  const chassisCost = getDraftChassisCost(draft);
  const abilityCost = roundBudget(abilities.reduce((sum, ability) => sum + ability.totalCost, 0));
  const totalCost = roundBudget(chassisCost + abilityCost);
  const remainingBudget = roundBudget(maxBudget - totalCost);

  return {
    maxBudget,
    chassisCost,
    abilityCost,
    totalCost,
    remainingBudget,
    withinBudget: remainingBudget >= 0,
    abilities
  };
}
