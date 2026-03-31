import { getAllCards } from "../data/cards";
import { renderCanonicalCardRules, renderCardRules, type TermOverrides } from "./text";
import type { Ability, CardDefinition, Effect, Faction, Selector, Status, TargetFilter, Trigger } from "./types";

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

const DEFAULT_ID = "custom-signal";

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
