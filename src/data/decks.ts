import type { DeckDefinition } from "../game/types";

export const STARTER_DECKS: Record<string, DeckDefinition> = {
  emberRush: {
    id: "emberRush",
    name: "Ember Rush",
    description: "Pressure the board with burn, hasty lane threats, and direct hero damage.",
    cards: [
      "ember-initiate",
      "ember-initiate",
      "cinder-scout",
      "cinder-scout",
      "spark-volley",
      "spark-volley",
      "scorchline",
      "scorchline",
      "ashen-broker",
      "ashen-broker",
      "furnace-hound",
      "furnace-hound",
      "blaze-archivist",
      "blaze-archivist",
      "ember-nest",
      "ember-nest",
      "firebrand-captain",
      "firebrand-captain",
      "crownfire",
      "inferno-giant"
    ]
  },
  verdantWard: {
    id: "verdantWard",
    name: "Verdant Ward",
    description: "Stabilize with healing, shields, attrition, and smart removal.",
    cards: [
      "field-medic",
      "field-medic",
      "aegis-smith",
      "aegis-smith",
      "mirror-squire",
      "mirror-squire",
      "venom-scholar",
      "venom-scholar",
      "restraint-bolt",
      "restraint-bolt",
      "chapel-caretaker",
      "chapel-caretaker",
      "null-mage",
      "null-mage",
      "duelist-protector",
      "grave-tutor",
      "orchard-sage",
      "lane-snare",
      "triage-order",
      "sever-the-weak"
    ]
  }
};

export function getDeckById(deckId: string): DeckDefinition {
  const deck = STARTER_DECKS[deckId];

  if (!deck) {
    throw new Error(`Unknown deck: ${deckId}`);
  }

  return deck;
}
