import { ability, effect, target } from "./abilities";
import type { CardDefinition } from "./types";
import type { TopologyKind } from "./topology";

export interface ProofCardDefinition {
  id: string;
  name: string;
  strapline: string;
  description: string;
  card: CardDefinition;
  anchorByTopology: Record<TopologyKind, string>;
}

export const PROOF_CARDS: ProofCardDefinition[] = [
  {
    id: "ward-ring",
    name: "Ward Ring",
    strapline: "Adjacent allies change shape when the board changes.",
    description: "Proof card for adjacency and ally geometry.",
    card: {
      id: "proof-ward-ring",
      name: "Ward Ring",
      faction: "verdant",
      kind: "spell",
      cost: 2,
      abilities: [ability("onPlay", effect.status("shielded", 1, target.adjacentAlly(["unit"])))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-center",
      raidBoss: "raid-arcanist-relay",
      twinfront: "tf-ally-center"
    }
  },
  {
    id: "mirror-pike",
    name: "Mirror Pike",
    strapline: "Opposition can mean a mirrored lane, a linked flank, a sector, or a shared front.",
    description: "Proof card for opposed-space targeting.",
    card: {
      id: "proof-mirror-pike",
      name: "Mirror Pike",
      faction: "ember",
      kind: "spell",
      cost: 3,
      abilities: [ability("onPlay", effect.damage(2, target.opposingUnitThisLane(["unit"])))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-west",
      raidBoss: "raid-vanguard-intercept",
      twinfront: "tf-ally-center"
    }
  },
  {
    id: "council-banner",
    name: "Council Banner",
    strapline: "Mass support grows or shrinks with alliance structure.",
    description: "Proof card for all-allies reach.",
    card: {
      id: "proof-council-banner",
      name: "Council Banner",
      faction: "neutral",
      kind: "spell",
      cost: 4,
      abilities: [ability("startOfTurn", effect.health(1, target.allAllies(["unit"])))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-center",
      raidBoss: "raid-arcanist-relay",
      twinfront: "tf-ally-center"
    }
  },
  {
    id: "skull-lantern",
    name: "Skull Lantern",
    strapline: "A simple chosen-enemy effect shows how legal target pools expand across topologies.",
    description: "Proof card for chosen-enemy legality.",
    card: {
      id: "proof-skull-lantern",
      name: "Skull Lantern",
      faction: "ember",
      kind: "spell",
      cost: 1,
      abilities: [ability("onPlay", effect.damage(1, target.chosenEnemy()))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-center",
      raidBoss: "raid-arcanist-relay",
      twinfront: "tf-ally-center"
    }
  },
  {
    id: "field-triage",
    name: "Field Triage",
    strapline: "Filtered ally targeting exposes who counts as damaged and friendly in each geometry.",
    description: "Proof card for damaged ally filtering.",
    card: {
      id: "proof-field-triage",
      name: "Field Triage",
      faction: "verdant",
      kind: "spell",
      cost: 2,
      abilities: [ability("onPlay", effect.heal(2, target.chosenAlly(["unit", "damaged"])))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-center",
      raidBoss: "raid-arcanist-relay",
      twinfront: "tf-ally-center"
    }
  },
  {
    id: "ember-nest",
    name: "Ember Nest",
    strapline: "Even a basic summon depends on what the board considers an eligible empty allied space.",
    description: "Proof card for open-space spawning.",
    card: {
      id: "proof-ember-nest",
      name: "Ember Nest",
      faction: "ember",
      kind: "spell",
      cost: 3,
      abilities: [ability("onPlay", effect.summon("spark-token", 1, "firstEmpty"))]
    },
    anchorByTopology: {
      laneDuel: "ld-self-center",
      triad: "triad-self-center",
      raidBoss: "raid-arcanist-relay",
      twinfront: "tf-ally-center"
    }
  }
];

export function getProofCardById(cardId: string): ProofCardDefinition {
  const card = PROOF_CARDS.find((entry) => entry.id === cardId);

  if (!card) {
    throw new Error(`Unknown proof card: ${cardId}`);
  }

  return card;
}
