import { ability, effect, target } from "../game/abilities";
import type { CardDefinition, UnitCardDefinition } from "../game/types";

const unit = (
  id: string,
  name: string,
  faction: CardDefinition["faction"],
  cost: number,
  attack: number,
  health: number,
  abilities = [] as CardDefinition["abilities"],
  token = false
): UnitCardDefinition => ({
  id,
  name,
  faction,
  kind: "unit",
  cost,
  attack,
  health,
  abilities,
  token
});

export const CARD_LIBRARY: Record<string, CardDefinition> = {
  "spark-token": unit("spark-token", "Spark", "token", 0, 1, 1, [], true),
  "bud-token": unit("bud-token", "Bud", "token", 0, 1, 2, [], true),

  "ember-initiate": unit(
    "ember-initiate",
    "Ember Initiate",
    "ember",
    1,
    2,
    1,
    [ability("onPlay", effect.damage(1, target.chosenEnemy()))]
  ),
  "cinder-scout": unit(
    "cinder-scout",
    "Cinder Scout",
    "ember",
    2,
    2,
    2,
    [ability("onAttack", effect.status("burning", 1, target.opposingUnitThisLane(["unit"])))]
  ),
  "spark-volley": {
    id: "spark-volley",
    name: "Spark Volley",
    faction: "ember",
    kind: "spell",
    cost: 2,
    abilities: [ability("onPlay", effect.damage(2, target.chosenEnemy()))]
  },
  "scorchline": {
    id: "scorchline",
    name: "Scorchline",
    faction: "ember",
    kind: "spell",
    cost: 3,
    abilities: [ability("onPlay", effect.damage(1, target.allEnemies(["unit"])))]
  },
  "ashen-broker": unit(
    "ashen-broker",
    "Ashen Broker",
    "ember",
    2,
    1,
    3,
    [ability("onPlay", effect.draw(1, target.friendlyHero()))]
  ),
  "furnace-hound": unit(
    "furnace-hound",
    "Furnace Hound",
    "ember",
    3,
    3,
    2,
    [ability("endOfTurn", effect.damage(1, target.enemyHero()))]
  ),
  "blaze-archivist": unit(
    "blaze-archivist",
    "Blaze Archivist",
    "ember",
    4,
    3,
    3,
    [ability("onPlay", effect.damage(1, target.chosenEnemy()), effect.draw(1, target.friendlyHero()))]
  ),
  "ember-nest": {
    id: "ember-nest",
    name: "Ember Nest",
    faction: "ember",
    kind: "spell",
    cost: 3,
    abilities: [ability("onPlay", effect.summon("spark-token", 2, "firstEmpty"))]
  },
  "firebrand-captain": unit(
    "firebrand-captain",
    "Firebrand Captain",
    "ember",
    4,
    3,
    4,
    [ability("onPlay", effect.attack(1, target.allAllies(["unit"])))]
  ),
  "inferno-giant": unit(
    "inferno-giant",
    "Inferno Giant",
    "ember",
    6,
    6,
    5,
    [ability("onDeath", effect.damage(2, target.allEnemies(["unit"])))]
  ),
  "crownfire": {
    id: "crownfire",
    name: "Crownfire",
    faction: "ember",
    kind: "spell",
    cost: 4,
    abilities: [ability("onPlay", effect.damage(3, target.enemyHero()))]
  },
  "slag-titan": unit("slag-titan", "Slag Titan", "neutral", 5, 4, 6),

  "field-medic": unit(
    "field-medic",
    "Field Medic",
    "verdant",
    2,
    1,
    3,
    [ability("onPlay", effect.heal(2, target.chosenAlly()))]
  ),
  "aegis-smith": unit(
    "aegis-smith",
    "Aegis Smith",
    "verdant",
    2,
    2,
    2,
    [ability("onPlay", effect.status("shielded", 1, target.chosenAlly(["unit"])))]
  ),
  "venom-scholar": unit(
    "venom-scholar",
    "Venom Scholar",
    "verdant",
    3,
    2,
    3,
    [ability("startOfTurn", effect.status("poisoned", 1, target.randomEnemy(["unit"])))]
  ),
  "restraint-bolt": {
    id: "restraint-bolt",
    name: "Restraint Bolt",
    faction: "verdant",
    kind: "spell",
    cost: 2,
    abilities: [ability("onPlay", effect.status("stunned", 1, target.chosenEnemy(["unit"])))]
  },
  "chapel-caretaker": unit(
    "chapel-caretaker",
    "Chapel Caretaker",
    "verdant",
    3,
    1,
    4,
    [ability("endOfTurn", effect.heal(1, target.adjacentAlly(["unit"])))]
  ),
  "null-mage": unit(
    "null-mage",
    "Null Mage",
    "verdant",
    3,
    2,
    2,
    [ability("onPlay", effect.destroy(target.chosenEnemy(["unit", "damaged"])))]
  ),
  "duelist-protector": unit(
    "duelist-protector",
    "Duelist Protector",
    "verdant",
    4,
    3,
    4,
    [ability("onPlay", effect.status("shielded", 1, target.self()), effect.attack(1, target.self()))]
  ),
  "grave-tutor": unit(
    "grave-tutor",
    "Grave Tutor",
    "verdant",
    4,
    2,
    4,
    [ability("onDeath", effect.draw(2, target.friendlyHero()))]
  ),
  "orchard-sage": unit(
    "orchard-sage",
    "Orchard Sage",
    "verdant",
    4,
    2,
    5,
    [ability("startOfTurn", effect.heal(1, target.allAllies(["unit"])))]
  ),
  "sever-the-weak": {
    id: "sever-the-weak",
    name: "Sever the Weak",
    faction: "verdant",
    kind: "spell",
    cost: 4,
    abilities: [ability("onPlay", effect.destroy(target.chosenEnemy(["unit", "damaged"])))]
  },
  "mirror-squire": unit(
    "mirror-squire",
    "Mirror Squire",
    "verdant",
    2,
    2,
    3,
    [ability("onPlay", effect.health(2, target.self()))]
  ),
  "lane-snare": unit(
    "lane-snare",
    "Lane Snare",
    "verdant",
    3,
    2,
    3,
    [ability("onAttack", effect.status("stunned", 1, target.opposingUnitThisLane(["unit"])))]
  ),
  "bloom-warden": unit(
    "bloom-warden",
    "Bloom Warden",
    "verdant",
    5,
    3,
    6,
    [ability("onPlay", effect.summon("bud-token", 1, "firstEmpty"), effect.status("shielded", 1, target.adjacentAlly(["unit"])))]
  ),
  "triage-order": {
    id: "triage-order",
    name: "Triage Order",
    faction: "verdant",
    kind: "spell",
    cost: 3,
    abilities: [ability("onPlay", effect.heal(2, target.chosenAlly()), effect.draw(1, target.friendlyHero()))]
  }
};

export function getCardById(cardId: string): CardDefinition {
  const card = CARD_LIBRARY[cardId];

  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }

  return card;
}

export function getAllCards(): CardDefinition[] {
  return Object.values(CARD_LIBRARY);
}
