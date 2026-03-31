import { getCardById } from "../data/cards";
import type { Ability, CardDefinition, Effect, Selector, Status, TargetFilter, TargetSpec, Trigger } from "./types";

type VerbKey = Effect["kind"];

export interface TermOverrides {
  triggers?: Partial<Record<Trigger, string>>;
  selectors?: Partial<Record<Selector, string>>;
  filters?: Partial<Record<TargetFilter, string>>;
  statuses?: Partial<Record<Status, string>>;
  verbs?: Partial<Record<VerbKey, string>>;
}

const triggerText: Record<Trigger, string> = {
  onPlay: "On play",
  onDeath: "On death",
  startOfTurn: "At the start of your turn",
  endOfTurn: "At the end of your turn",
  onAttack: "On attack"
};

const canonicalTriggerText: Record<Trigger, string> = {
  onPlay: "on play",
  onDeath: "on death",
  startOfTurn: "start of turn",
  endOfTurn: "end of turn",
  onAttack: "on attack"
};

const selectorText: Record<Selector, string> = {
  self: "self",
  chosenAlly: "chosen ally",
  chosenEnemy: "chosen enemy",
  randomEnemy: "random enemy",
  adjacentAlly: "adjacent allies",
  opposingUnitThisLane: "opposing unit in this lane",
  allAllies: "all allied",
  allEnemies: "all enemy",
  friendlyHero: "your hero",
  enemyHero: "the enemy hero"
};

const filterText: Record<TargetFilter, string> = {
  unit: "unit",
  hero: "hero",
  damaged: "damaged"
};

const pluralFilterText: Record<Exclude<TargetFilter, "damaged">, string> = {
  unit: "units",
  hero: "heroes"
};

const statusText: Record<Status, string> = {
  poisoned: "Poisoned",
  stunned: "Stunned",
  shielded: "Shielded",
  burning: "Burning"
};

const verbFriendlyText: Record<VerbKey, string> = {
  dealDamage: "Deal",
  heal: "Restore",
  drawCards: "Draw",
  summonToken: "Summon",
  grantStatus: "Give",
  modifyAttack: "Give",
  modifyHealth: "Give",
  destroy: "Destroy"
};

const verbCanonicalText: Record<VerbKey, string> = {
  dealDamage: "deal",
  heal: "restore",
  drawCards: "draw",
  summonToken: "summon",
  grantStatus: "give",
  modifyAttack: "give",
  modifyHealth: "give",
  destroy: "destroy"
};

function hasFilter(target: TargetSpec, filter: TargetFilter): boolean {
  return target.filters?.includes(filter) ?? false;
}

function getTriggerLabel(trigger: Trigger, terms?: TermOverrides, canonical = false): string {
  return terms?.triggers?.[trigger] ?? (canonical ? canonicalTriggerText[trigger] : triggerText[trigger]);
}

function getSelectorLabel(selector: Selector, terms?: TermOverrides): string {
  return terms?.selectors?.[selector] ?? selectorText[selector];
}

function getFilterLabel(filter: TargetFilter, terms?: TermOverrides): string {
  return terms?.filters?.[filter] ?? filterText[filter];
}

function getPluralFilterLabel(filter: Exclude<TargetFilter, "damaged">, terms?: TermOverrides): string {
  const override = terms?.filters?.[filter];

  if (!override) {
    return pluralFilterText[filter];
  }

  if (override.endsWith("s")) {
    return override;
  }

  if (override.endsWith("y")) {
    return `${override.slice(0, -1)}ies`;
  }

  if (override === "hero") {
    return "heroes";
  }

  return `${override}s`;
}

function getStatusLabel(status: Status, terms?: TermOverrides): string {
  return terms?.statuses?.[status] ?? statusText[status];
}

function getVerbLabel(effectKind: VerbKey, terms?: TermOverrides, canonical = false): string {
  return terms?.verbs?.[effectKind] ?? (canonical ? verbCanonicalText[effectKind] : verbFriendlyText[effectKind]);
}

function formatChosenTarget(selector: "chosenAlly" | "chosenEnemy", target: TargetSpec, terms?: TermOverrides): string {
  const parts: string[] = [];

  if (hasFilter(target, "damaged")) {
    parts.push(getFilterLabel("damaged", terms));
  }

  parts.push(getSelectorLabel(selector, terms));

  if (hasFilter(target, "unit")) {
    parts.push(getFilterLabel("unit", terms));
  } else if (hasFilter(target, "hero")) {
    parts.push(getFilterLabel("hero", terms));
  }

  return parts.join(" ");
}

function formatGroupedTarget(selector: "allAllies" | "allEnemies", target: TargetSpec, terms?: TermOverrides): string {
  const pieces: string[] = [];

  if (hasFilter(target, "damaged")) {
    pieces.push(getFilterLabel("damaged", terms));
  }

  pieces.push(getSelectorLabel(selector, terms));

  if (hasFilter(target, "hero")) {
    pieces.push(getPluralFilterLabel("hero", terms));
  } else {
    pieces.push(getPluralFilterLabel("unit", terms));
  }

  return pieces.join(" ");
}

export function renderTarget(target: TargetSpec, terms?: TermOverrides): string {
  switch (target.selector) {
    case "self":
      return getSelectorLabel("self", terms);
    case "chosenAlly":
      return formatChosenTarget("chosenAlly", target, terms);
    case "chosenEnemy":
      return formatChosenTarget("chosenEnemy", target, terms);
    case "randomEnemy":
      return hasFilter(target, "damaged")
        ? `a ${getSelectorLabel("randomEnemy", terms)} ${getFilterLabel("damaged", terms)} ${getFilterLabel("unit", terms)}`
        : `a ${getSelectorLabel("randomEnemy", terms)} ${getFilterLabel("unit", terms)}`;
    case "adjacentAlly":
      return hasFilter(target, "damaged")
        ? `${getSelectorLabel("adjacentAlly", terms)} ${getFilterLabel("damaged", terms)}`
        : getSelectorLabel("adjacentAlly", terms);
    case "opposingUnitThisLane":
      return hasFilter(target, "damaged")
        ? `the ${getFilterLabel("damaged", terms)} ${getSelectorLabel("opposingUnitThisLane", terms)}`
        : `the ${getSelectorLabel("opposingUnitThisLane", terms)}`;
    case "allAllies":
      return formatGroupedTarget("allAllies", target, terms);
    case "allEnemies":
      return formatGroupedTarget("allEnemies", target, terms);
    case "friendlyHero":
      return getSelectorLabel("friendlyHero", terms);
    case "enemyHero":
      return getSelectorLabel("enemyHero", terms);
    default:
      return "target";
  }
}

function renderSummonToken(effect: Extract<Effect, { kind: "summonToken" }>, terms?: TermOverrides, canonical = false): string {
  const token = getCardById(effect.tokenCardId);
  const countLabel = effect.amount === 1 ? token.name : `${effect.amount} ${token.name}s`;
  const positionLabel =
    effect.position === "sameLane" ? "in this lane if it is open" : "into the first empty lane";
  const verb = getVerbLabel("summonToken", terms, canonical);

  return canonical ? `${verb} ${countLabel} ${positionLabel}` : `${verb} ${countLabel} ${positionLabel}.`;
}

export function renderEffect(effect: Effect, terms?: TermOverrides): string {
  switch (effect.kind) {
    case "dealDamage":
      return `${getVerbLabel("dealDamage", terms)} ${effect.amount} damage to ${renderTarget(effect.target, terms)}.`;
    case "heal":
      return `${getVerbLabel("heal", terms)} ${effect.amount} health to ${renderTarget(effect.target, terms)}.`;
    case "drawCards":
      if (effect.target.selector === "friendlyHero") {
        return `${getVerbLabel("drawCards", terms)} ${effect.amount} card${effect.amount === 1 ? "" : "s"}.`;
      }

      return `${renderTarget(effect.target, terms)} ${getVerbLabel("drawCards", terms).toLowerCase()} ${
        effect.amount
      } card${effect.amount === 1 ? "" : "s"}.`;
    case "summonToken":
      return renderSummonToken(effect, terms);
    case "grantStatus":
      return `${getVerbLabel("grantStatus", terms)} ${getStatusLabel(effect.status, terms)} ${effect.amount} to ${renderTarget(
        effect.target,
        terms
      )}.`;
    case "modifyAttack":
      return `${getVerbLabel("modifyAttack", terms)} ${effect.amount >= 0 ? "+" : ""}${effect.amount} attack to ${renderTarget(
        effect.target,
        terms
      )}.`;
    case "modifyHealth":
      return `${getVerbLabel("modifyHealth", terms)} ${effect.amount >= 0 ? "+" : ""}${effect.amount} health to ${renderTarget(
        effect.target,
        terms
      )}.`;
    case "destroy":
      return `${getVerbLabel("destroy", terms)} ${renderTarget(effect.target, terms)}.`;
    default:
      return "Do something interesting.";
  }
}

export function renderCanonicalEffect(effect: Effect, terms?: TermOverrides): string {
  switch (effect.kind) {
    case "dealDamage":
      return `${getVerbLabel("dealDamage", terms, true)} ${effect.amount} damage to ${renderTarget(effect.target, terms)}`;
    case "heal":
      return `${getVerbLabel("heal", terms, true)} ${effect.amount} health to ${renderTarget(effect.target, terms)}`;
    case "drawCards":
      if (effect.target.selector === "friendlyHero") {
        return `${getVerbLabel("drawCards", terms, true)} ${effect.amount} card${effect.amount === 1 ? "" : "s"}`;
      }

      return `${renderTarget(effect.target, terms)} ${getVerbLabel("drawCards", terms, true)} ${
        effect.amount
      } card${effect.amount === 1 ? "" : "s"}`;
    case "summonToken":
      return renderSummonToken(effect, terms, true);
    case "grantStatus":
      return `${getVerbLabel("grantStatus", terms, true)} ${getStatusLabel(effect.status, terms)} ${effect.amount} to ${renderTarget(
        effect.target,
        terms
      )}`;
    case "modifyAttack":
      return `${getVerbLabel("modifyAttack", terms, true)} ${effect.amount >= 0 ? "+" : ""}${effect.amount} attack to ${renderTarget(
        effect.target,
        terms
      )}`;
    case "modifyHealth":
      return `${getVerbLabel("modifyHealth", terms, true)} ${effect.amount >= 0 ? "+" : ""}${effect.amount} health to ${renderTarget(
        effect.target,
        terms
      )}`;
    case "destroy":
      return `${getVerbLabel("destroy", terms, true)} ${renderTarget(effect.target, terms)}`;
    default:
      return "do something";
  }
}

export function renderAbility(ability: Ability, terms?: TermOverrides): string {
  return `${getTriggerLabel(ability.trigger, terms)}: ${ability.effects.map((effect) => renderEffect(effect, terms)).join(" Then ")}`;
}

export function renderCanonicalAbility(ability: Ability, terms?: TermOverrides): string {
  return `${getTriggerLabel(ability.trigger, terms, true)} -> ${ability.effects
    .map((effect) => renderCanonicalEffect(effect, terms))
    .join(" ; ")}`;
}

export function renderCardRules(card: CardDefinition, terms?: TermOverrides): string[] {
  return card.abilities.map((ability) => renderAbility(ability, terms));
}

export function renderCanonicalCardRules(card: CardDefinition, terms?: TermOverrides): string[] {
  return card.abilities.map((ability) => renderCanonicalAbility(ability, terms));
}
