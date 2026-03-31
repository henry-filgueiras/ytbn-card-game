import { getCardById } from "../data/cards";
import { renderCanonicalCardRules } from "./text";
import type { Ability, CardDefinition, Effect, Selector, TargetFilter, TargetSpec, Trigger } from "./types";

export const TOPOLOGY_KINDS = ["laneDuel", "triad", "raidBoss", "twinfront"] as const;
export type TopologyKind = (typeof TOPOLOGY_KINDS)[number];

type NodeTeam = "self" | "ally" | "enemy" | "boss";
type NodeKind = "space" | "hero";
type OccupancyState = "source" | "occupied" | "empty" | "hero";
type EdgeKind = "adjacent" | "opposed" | "group";

interface SelectorInterpretation {
  label: string;
  note: string;
}

interface SummonInterpretation {
  label: string;
  note: string;
}

interface TopologyAdapter {
  kind: TopologyKind;
  displayName: string;
  selectorInterpretations: Record<Selector, SelectorInterpretation>;
  summonInterpretations: Record<Extract<Effect, { kind: "summonToken" }>["position"], SummonInterpretation>;
  alliedSpaceOrder: string[];
}

interface InterpretedTargetSpec {
  selector: Selector;
  renderedLabel: string;
  note: string;
  allowedNodeKinds: NodeKind[];
  includeEmptySpaces: boolean;
}

interface InterpretedEffect {
  effect: Effect;
  renderedText: string;
  previewTargets: PreviewTarget[];
  explanations: TransformExplanation[];
  targetingNotes: string[];
}

interface InterpretedAbility {
  ability: Ability;
  renderedText: string;
  previewTargets: PreviewTarget[];
  explanations: TransformExplanation[];
  targetingNotes: string[];
}

export interface ProofNode {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  team: NodeTeam;
  seat: string;
  kind: NodeKind;
  occupancy: OccupancyState;
  damaged?: boolean;
}

export interface ProofEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export interface ProofDiagram {
  kind: TopologyKind;
  displayName: string;
  subtitle: string;
  nodes: ProofNode[];
  edges: ProofEdge[];
}

export interface PreviewTarget {
  nodeId: string;
  emphasis: "source" | "legal";
  reason: string;
}

export interface TransformExplanation {
  term: string;
  canonical: string;
  transformed: string;
  note: string;
}

export interface TopologyProofResult {
  topologyKind: TopologyKind;
  displayName: string;
  diagram: ProofDiagram;
  canonicalRules: string[];
  renderedRules: string[];
  canonicalPayload: CardDefinition;
  transform: TransformExplanation[];
  previewTargets: PreviewTarget[];
  targetingNotes: string[];
  anchorNodeId: string;
}

const TRIGGER_LABELS: Record<Trigger, string> = {
  onPlay: "On play",
  onDeath: "On death",
  startOfTurn: "At the start of your turn",
  endOfTurn: "At the end of your turn",
  onAttack: "On attack"
};

const STATUS_LABELS = {
  poisoned: "Poisoned",
  stunned: "Stunned",
  shielded: "Shielded",
  burning: "Burning"
} as const;

const CANONICAL_SELECTOR_LABELS: Record<Selector, string> = {
  self: "self",
  chosenAlly: "chosenAlly",
  chosenEnemy: "chosenEnemy",
  randomEnemy: "randomEnemy",
  adjacentAlly: "adjacentAlly",
  opposingUnitThisLane: "opposingUnitThisLane",
  allAllies: "allAllies",
  allEnemies: "allEnemies",
  friendlyHero: "friendlyHero",
  enemyHero: "enemyHero"
};

const TOPOLOGY_ADAPTERS: Record<TopologyKind, TopologyAdapter> = {
  laneDuel: {
    kind: "laneDuel",
    displayName: "Lane Duel",
    selectorInterpretations: {
      self: { label: "this lane", note: "The source is anchored to one occupied friendly lane." },
      chosenAlly: {
        label: "chosen allied lane or hero",
        note: "Legal allies are your occupied lanes plus your hero when hero targeting is allowed."
      },
      chosenEnemy: {
        label: "chosen enemy lane or hero",
        note: "Enemy legality comes from the single opposing side."
      },
      randomEnemy: {
        label: "random enemy lane",
        note: "Random enemy effects sample from occupied enemy lanes."
      },
      adjacentAlly: {
        label: "adjacent allied lane",
        note: "Adjacency means the neighboring friendly lane slots."
      },
      opposingUnitThisLane: {
        label: "mirrored enemy lane",
        note: "Opposition is the directly mirrored lane across the battlefield."
      },
      allAllies: {
        label: "all occupied friendly lanes",
        note: "Group support only sees your own occupied board."
      },
      allEnemies: {
        label: "all occupied enemy lanes",
        note: "Mass enemy effects stay bounded to one opposing board."
      },
      friendlyHero: {
        label: "your hero",
        note: "Friendly hero references stay singular."
      },
      enemyHero: {
        label: "the enemy hero",
        note: "There is exactly one opposing commander."
      }
    },
    summonInterpretations: {
      firstEmpty: {
        label: "the first empty allied lane",
        note: "Open-space spawning scans allied lanes from left to right and chooses the first open one."
      },
      sameLane: {
        label: "this lane if it is open",
        note: "Same-lane summoning only works if the source lane is currently open."
      }
    },
    alliedSpaceOrder: ["ld-self-left", "ld-self-center", "ld-self-right"]
  },
  triad: {
    kind: "triad",
    displayName: "Triad Skirmish",
    selectorInterpretations: {
      self: {
        label: "this space in your seat",
        note: "The source still belongs to one commander, but that commander now faces two rivals."
      },
      chosenAlly: {
        label: "chosen space or commander in your seat",
        note: "In triad there is no teammate, so ally selectors collapse to your own seat."
      },
      chosenEnemy: {
        label: "chosen rival space or commander",
        note: "Legal enemies include both rival seats instead of one global opposite side."
      },
      randomEnemy: {
        label: "random rival space",
        note: "Random enemy selection can pull from either rival formation, but only from occupied spaces."
      },
      adjacentAlly: {
        label: "adjacent space in your seat",
        note: "Adjacency means neighboring spaces inside your own seat geometry."
      },
      opposingUnitThisLane: {
        label: "rival space linked to this flank",
        note: "A flank points toward one rival, so opposition depends on the source space."
      },
      allAllies: {
        label: "all occupied spaces in your seat",
        note: "Mass ally effects only touch your own commander footprint."
      },
      allEnemies: {
        label: "all occupied rival spaces",
        note: "Wide enemy effects reach both rival seats at once."
      },
      friendlyHero: {
        label: "your commander",
        note: "Friendly hero language becomes commander language."
      },
      enemyHero: {
        label: "a rival commander",
        note: "Enemy hero targeting can point at either rival leader."
      }
    },
    summonInterpretations: {
      firstEmpty: {
        label: "the first open space in your seat",
        note: "Open-space spawning only scans the spaces that belong to your seat."
      },
      sameLane: {
        label: "this space if it is open",
        note: "Same-space summoning stays local to the source space."
      }
    },
    alliedSpaceOrder: ["triad-self-west", "triad-self-center", "triad-self-east"]
  },
  raidBoss: {
    kind: "raidBoss",
    displayName: "Raid Boss Engagement",
    selectorInterpretations: {
      self: {
        label: "this raid space",
        note: "The source is one raider position inside a larger cooperative formation."
      },
      chosenAlly: {
        label: "chosen allied raid space or raid lead",
        note: "Friendly targets can include other raid pods, not just the source pod."
      },
      chosenEnemy: {
        label: "chosen boss sector or boss core",
        note: "Enemies collapse into a boss core plus its occupied sectors."
      },
      randomEnemy: {
        label: "random boss sector",
        note: "Random enemy effects sample only from occupied boss sectors."
      },
      adjacentAlly: {
        label: "neighboring allied raid spaces",
        note: "Adjacency can cross pod boundaries when the raid line touches."
      },
      opposingUnitThisLane: {
        label: "boss sector facing this pod",
        note: "Opposition means the threat sector lined up against your raid pod."
      },
      allAllies: {
        label: "all occupied raid spaces",
        note: "Mass support scales up because the raid is one allied formation."
      },
      allEnemies: {
        label: "all occupied boss sectors",
        note: "Wide enemy effects map onto the boss's occupied sector array."
      },
      friendlyHero: {
        label: "the raid lead",
        note: "Friendly hero language becomes raid-lead language."
      },
      enemyHero: {
        label: "the boss core",
        note: "Enemy hero language becomes the boss's core body."
      }
    },
    summonInterpretations: {
      firstEmpty: {
        label: "the first open allied raid space",
        note: "Open-space spawning scans the raid line from left to right and takes the first open allied space."
      },
      sameLane: {
        label: "this raid space if it is open",
        note: "Same-space summoning stays bound to the current raid position."
      }
    },
    alliedSpaceOrder: [
      "raid-vanguard-intercept",
      "raid-vanguard-support",
      "raid-arcanist-channel",
      "raid-arcanist-relay",
      "raid-skirmisher-ambush",
      "raid-skirmisher-recovery"
    ]
  },
  twinfront: {
    kind: "twinfront",
    displayName: "Twinfront Clash",
    selectorInterpretations: {
      self: {
        label: "this allied front",
        note: "The source belongs to one team space inside a partnered formation."
      },
      chosenAlly: {
        label: "chosen allied front or partner commander",
        note: "Ally targeting can reach across to your partner's half of the formation."
      },
      chosenEnemy: {
        label: "chosen enemy front or commander",
        note: "Enemy legality includes both opposing commanders and their occupied fronts."
      },
      randomEnemy: {
        label: "random enemy front",
        note: "Random enemy effects draw only from the occupied enemy line."
      },
      adjacentAlly: {
        label: "linked allied fronts",
        note: "Adjacency can bridge through the shared center between partners."
      },
      opposingUnitThisLane: {
        label: "enemy front contesting this line",
        note: "Opposition follows the shared battle line, not a single mirrored seat."
      },
      allAllies: {
        label: "all occupied allied fronts",
        note: "Mass ally effects scale across both teammates."
      },
      allEnemies: {
        label: "all occupied enemy fronts",
        note: "Mass enemy effects can wash across the whole opposing team line."
      },
      friendlyHero: {
        label: "your team lead",
        note: "Friendly hero language points into a partnered command structure."
      },
      enemyHero: {
        label: "an enemy commander",
        note: "Enemy hero targeting may point at either commander."
      }
    },
    summonInterpretations: {
      firstEmpty: {
        label: "the first open allied front",
        note: "Open-space spawning scans your team line, including the shared center, and chooses the first open allied front."
      },
      sameLane: {
        label: "this front if it is open",
        note: "Same-front summoning stays local to the current battle line."
      }
    },
    alliedSpaceOrder: ["tf-ally-left-flank", "tf-ally-left-support", "tf-ally-center", "tf-ally-right-support", "tf-ally-right-flank"]
  }
};

const TOPOLOGY_DIAGRAMS: Record<TopologyKind, ProofDiagram> = {
  laneDuel: {
    kind: "laneDuel",
    displayName: "Lane Duel",
    subtitle: "Mirrored three-lane battlefield",
    nodes: [
      { id: "ld-enemy-hero", label: "Enemy Hero", shortLabel: "Hero", x: 50, y: 10, team: "enemy", seat: "enemy", kind: "hero", occupancy: "hero" },
      { id: "ld-enemy-left", label: "Enemy Left", shortLabel: "L", x: 22, y: 30, team: "enemy", seat: "enemy", kind: "space", occupancy: "occupied", damaged: true },
      { id: "ld-enemy-center", label: "Enemy Center", shortLabel: "C", x: 50, y: 30, team: "enemy", seat: "enemy", kind: "space", occupancy: "occupied" },
      { id: "ld-enemy-right", label: "Enemy Right", shortLabel: "R", x: 78, y: 30, team: "enemy", seat: "enemy", kind: "space", occupancy: "occupied" },
      { id: "ld-self-left", label: "Friendly Left", shortLabel: "L", x: 22, y: 70, team: "self", seat: "self", kind: "space", occupancy: "empty" },
      { id: "ld-self-center", label: "Friendly Center", shortLabel: "C", x: 50, y: 70, team: "self", seat: "self", kind: "space", occupancy: "source" },
      { id: "ld-self-right", label: "Friendly Right", shortLabel: "R", x: 78, y: 70, team: "self", seat: "self", kind: "space", occupancy: "occupied", damaged: true },
      { id: "ld-self-hero", label: "Your Hero", shortLabel: "Hero", x: 50, y: 90, team: "self", seat: "self", kind: "hero", occupancy: "hero" }
    ],
    edges: [
      { from: "ld-self-left", to: "ld-self-center", kind: "adjacent" },
      { from: "ld-self-center", to: "ld-self-right", kind: "adjacent" },
      { from: "ld-self-left", to: "ld-enemy-left", kind: "opposed" },
      { from: "ld-self-center", to: "ld-enemy-center", kind: "opposed" },
      { from: "ld-self-right", to: "ld-enemy-right", kind: "opposed" }
    ]
  },
  triad: {
    kind: "triad",
    displayName: "Triad Skirmish",
    subtitle: "Three rival seats around a political triangle",
    nodes: [
      { id: "triad-west-hero", label: "West Commander", shortLabel: "W", x: 18, y: 16, team: "enemy", seat: "west", kind: "hero", occupancy: "hero" },
      { id: "triad-west-north", label: "West North Flank", shortLabel: "WN", x: 12, y: 34, team: "enemy", seat: "west", kind: "space", occupancy: "occupied" },
      { id: "triad-west-center", label: "West Cache", shortLabel: "WC", x: 26, y: 42, team: "enemy", seat: "west", kind: "space", occupancy: "occupied" },
      { id: "triad-west-east", label: "West East Flank", shortLabel: "WE", x: 38, y: 30, team: "enemy", seat: "west", kind: "space", occupancy: "empty" },
      { id: "triad-east-hero", label: "East Commander", shortLabel: "E", x: 82, y: 16, team: "enemy", seat: "east", kind: "hero", occupancy: "hero" },
      { id: "triad-east-north", label: "East North Flank", shortLabel: "EN", x: 88, y: 34, team: "enemy", seat: "east", kind: "space", occupancy: "occupied", damaged: true },
      { id: "triad-east-center", label: "East Cache", shortLabel: "EC", x: 74, y: 42, team: "enemy", seat: "east", kind: "space", occupancy: "occupied" },
      { id: "triad-east-west", label: "East West Flank", shortLabel: "EW", x: 62, y: 30, team: "enemy", seat: "east", kind: "space", occupancy: "occupied" },
      { id: "triad-self-hero", label: "Your Commander", shortLabel: "You", x: 50, y: 88, team: "self", seat: "self", kind: "hero", occupancy: "hero" },
      { id: "triad-self-west", label: "Your West Flank", shortLabel: "SW", x: 34, y: 68, team: "self", seat: "self", kind: "space", occupancy: "occupied", damaged: true },
      { id: "triad-self-center", label: "Your Cache", shortLabel: "SC", x: 50, y: 58, team: "self", seat: "self", kind: "space", occupancy: "source" },
      { id: "triad-self-east", label: "Your East Flank", shortLabel: "SE", x: 66, y: 68, team: "self", seat: "self", kind: "space", occupancy: "empty" }
    ],
    edges: [
      { from: "triad-self-west", to: "triad-self-center", kind: "adjacent" },
      { from: "triad-self-center", to: "triad-self-east", kind: "adjacent" },
      { from: "triad-self-west", to: "triad-west-east", kind: "opposed" },
      { from: "triad-self-east", to: "triad-east-west", kind: "opposed" }
    ]
  },
  raidBoss: {
    kind: "raidBoss",
    displayName: "Raid Boss Engagement",
    subtitle: "Boss apex above a coordinated defender fan",
    nodes: [
      { id: "raid-boss-core", label: "Boss Core", shortLabel: "Boss", x: 50, y: 10, team: "boss", seat: "boss", kind: "hero", occupancy: "hero" },
      { id: "raid-boss-left", label: "Siege Left", shortLabel: "SL", x: 14, y: 28, team: "boss", seat: "boss", kind: "space", occupancy: "occupied" },
      { id: "raid-boss-outer-gate", label: "Outer Gate", shortLabel: "OG", x: 32, y: 28, team: "boss", seat: "boss", kind: "space", occupancy: "occupied", damaged: true },
      { id: "raid-boss-heart", label: "Heart Chamber", shortLabel: "HC", x: 50, y: 28, team: "boss", seat: "boss", kind: "space", occupancy: "occupied" },
      { id: "raid-boss-inner-gate", label: "Inner Gate", shortLabel: "IG", x: 68, y: 28, team: "boss", seat: "boss", kind: "space", occupancy: "occupied" },
      { id: "raid-boss-right", label: "Siege Right", shortLabel: "SR", x: 86, y: 28, team: "boss", seat: "boss", kind: "space", occupancy: "occupied" },
      { id: "raid-vanguard-intercept", label: "Vanguard Intercept", shortLabel: "VI", x: 18, y: 72, team: "self", seat: "vanguard", kind: "space", occupancy: "occupied" },
      { id: "raid-vanguard-support", label: "Vanguard Support", shortLabel: "VS", x: 28, y: 82, team: "self", seat: "vanguard", kind: "space", occupancy: "occupied", damaged: true },
      { id: "raid-arcanist-channel", label: "Arcanist Channel", shortLabel: "AC", x: 44, y: 82, team: "ally", seat: "arcanist", kind: "space", occupancy: "empty" },
      { id: "raid-arcanist-relay", label: "Arcanist Relay", shortLabel: "AR", x: 50, y: 66, team: "ally", seat: "arcanist", kind: "space", occupancy: "source" },
      { id: "raid-skirmisher-ambush", label: "Skirmisher Ambush", shortLabel: "SA", x: 72, y: 72, team: "ally", seat: "skirmisher", kind: "space", occupancy: "occupied" },
      { id: "raid-skirmisher-recovery", label: "Skirmisher Recovery", shortLabel: "SR", x: 82, y: 82, team: "ally", seat: "skirmisher", kind: "space", occupancy: "empty" }
    ],
    edges: [
      { from: "raid-vanguard-support", to: "raid-arcanist-relay", kind: "adjacent" },
      { from: "raid-arcanist-relay", to: "raid-skirmisher-ambush", kind: "adjacent" },
      { from: "raid-vanguard-intercept", to: "raid-boss-outer-gate", kind: "opposed" },
      { from: "raid-arcanist-relay", to: "raid-boss-heart", kind: "opposed" },
      { from: "raid-skirmisher-ambush", to: "raid-boss-inner-gate", kind: "opposed" }
    ]
  },
  twinfront: {
    kind: "twinfront",
    displayName: "Twinfront Clash",
    subtitle: "Two allied seats bridged by a shared center line",
    nodes: [
      { id: "tf-enemy-left-hero", label: "Enemy Left Commander", shortLabel: "EL", x: 18, y: 12, team: "enemy", seat: "enemyLeft", kind: "hero", occupancy: "hero" },
      { id: "tf-enemy-right-hero", label: "Enemy Right Commander", shortLabel: "ER", x: 82, y: 12, team: "enemy", seat: "enemyRight", kind: "hero", occupancy: "hero" },
      { id: "tf-enemy-left-flank", label: "Enemy Left Flank", shortLabel: "ELF", x: 18, y: 34, team: "enemy", seat: "enemyLeft", kind: "space", occupancy: "occupied" },
      { id: "tf-enemy-left-support", label: "Enemy Left Support", shortLabel: "ELS", x: 34, y: 34, team: "enemy", seat: "enemyLeft", kind: "space", occupancy: "occupied", damaged: true },
      { id: "tf-enemy-center", label: "Enemy Shared Front", shortLabel: "EC", x: 50, y: 34, team: "enemy", seat: "enemyTeam", kind: "space", occupancy: "occupied" },
      { id: "tf-enemy-right-support", label: "Enemy Right Support", shortLabel: "ERS", x: 66, y: 34, team: "enemy", seat: "enemyRight", kind: "space", occupancy: "occupied" },
      { id: "tf-enemy-right-flank", label: "Enemy Right Flank", shortLabel: "ERF", x: 82, y: 34, team: "enemy", seat: "enemyRight", kind: "space", occupancy: "occupied" },
      { id: "tf-ally-left-hero", label: "Ally Left Commander", shortLabel: "AL", x: 18, y: 88, team: "ally", seat: "allyLeft", kind: "hero", occupancy: "hero" },
      { id: "tf-ally-right-hero", label: "Your Commander", shortLabel: "You", x: 82, y: 88, team: "self", seat: "allyRight", kind: "hero", occupancy: "hero" },
      { id: "tf-ally-left-flank", label: "Ally Left Flank", shortLabel: "ALF", x: 18, y: 66, team: "ally", seat: "allyLeft", kind: "space", occupancy: "occupied" },
      { id: "tf-ally-left-support", label: "Ally Left Support", shortLabel: "ALS", x: 34, y: 66, team: "ally", seat: "allyLeft", kind: "space", occupancy: "occupied", damaged: true },
      { id: "tf-ally-center", label: "Shared Allied Front", shortLabel: "AC", x: 50, y: 66, team: "self", seat: "allyTeam", kind: "space", occupancy: "source" },
      { id: "tf-ally-right-support", label: "Your Support", shortLabel: "ARS", x: 66, y: 66, team: "self", seat: "allyRight", kind: "space", occupancy: "occupied" },
      { id: "tf-ally-right-flank", label: "Your Flank", shortLabel: "ARF", x: 82, y: 66, team: "self", seat: "allyRight", kind: "space", occupancy: "empty" }
    ],
    edges: [
      { from: "tf-ally-left-support", to: "tf-ally-center", kind: "adjacent" },
      { from: "tf-ally-center", to: "tf-ally-right-support", kind: "adjacent" },
      { from: "tf-ally-center", to: "tf-enemy-center", kind: "opposed" },
      { from: "tf-ally-left-flank", to: "tf-enemy-left-flank", kind: "opposed" },
      { from: "tf-ally-right-flank", to: "tf-enemy-right-flank", kind: "opposed" }
    ]
  }
};

function selectorDefaultKinds(selector: Selector): NodeKind[] {
  switch (selector) {
    case "chosenAlly":
    case "chosenEnemy":
      return ["space", "hero"];
    case "friendlyHero":
    case "enemyHero":
      return ["hero"];
    default:
      return ["space"];
  }
}

function hasFilter(target: TargetSpec, filter: TargetFilter): boolean {
  return target.filters?.includes(filter) ?? false;
}

function pluralize(word: string): string {
  if (word.endsWith("s")) {
    return word;
  }

  if (word.endsWith("y")) {
    return `${word.slice(0, -1)}ies`;
  }

  return `${word}s`;
}

function getLinkedNodes(diagram: ProofDiagram, nodeId: string, kind: EdgeKind): ProofNode[] {
  const linkedIds = diagram.edges.flatMap((edge) => {
    if (edge.kind !== kind) {
      return [];
    }

    if (edge.from === nodeId) {
      return [edge.to];
    }

    if (edge.to === nodeId) {
      return [edge.from];
    }

    return [];
  });

  return diagram.nodes.filter((node) => linkedIds.includes(node.id));
}

function isAlliedNode(node: ProofNode): boolean {
  return node.team === "self" || node.team === "ally";
}

function isEnemyNode(node: ProofNode): boolean {
  return node.team === "enemy" || node.team === "boss";
}

function nodeMatchesFilter(node: ProofNode, filter: TargetFilter): boolean {
  switch (filter) {
    case "unit":
      return node.kind === "space" && node.occupancy !== "empty";
    case "hero":
      return node.kind === "hero";
    case "damaged":
      return Boolean(node.damaged);
    default:
      return true;
  }
}

function interpretTargetSpec(targetSpec: TargetSpec, adapter: TopologyAdapter): InterpretedTargetSpec {
  const allowedNodeKinds: NodeKind[] =
    hasFilter(targetSpec, "unit") ? ["space"] : hasFilter(targetSpec, "hero") ? ["hero"] : selectorDefaultKinds(targetSpec.selector);

  return {
    selector: targetSpec.selector,
    renderedLabel: adapter.selectorInterpretations[targetSpec.selector].label,
    note: adapter.selectorInterpretations[targetSpec.selector].note,
    allowedNodeKinds,
    includeEmptySpaces: false
  };
}

function filterNodesForInterpretedTarget(targetSpec: TargetSpec, interpretation: InterpretedTargetSpec, nodes: ProofNode[]): ProofNode[] {
  return nodes.filter((node) => {
    if (!interpretation.allowedNodeKinds.includes(node.kind)) {
      return false;
    }

    if (node.kind === "space" && !interpretation.includeEmptySpaces && node.occupancy === "empty") {
      return false;
    }

    return (targetSpec.filters ?? []).every((filter) => nodeMatchesFilter(node, filter));
  });
}

function getCandidateNodes(diagram: ProofDiagram, anchorNodeId: string, targetSpec: TargetSpec): ProofNode[] {
  const anchor = diagram.nodes.find((node) => node.id === anchorNodeId);

  if (!anchor) {
    return [];
  }

  switch (targetSpec.selector) {
    case "self":
      return [anchor];
    case "chosenAlly":
      return diagram.nodes.filter((node) => isAlliedNode(node));
    case "chosenEnemy":
      return diagram.nodes.filter((node) => isEnemyNode(node));
    case "randomEnemy":
      return diagram.nodes.filter((node) => isEnemyNode(node));
    case "adjacentAlly":
      return getLinkedNodes(diagram, anchorNodeId, "adjacent").filter((node) => isAlliedNode(node));
    case "opposingUnitThisLane":
      return getLinkedNodes(diagram, anchorNodeId, "opposed").filter((node) => isEnemyNode(node));
    case "allAllies":
      return diagram.nodes.filter((node) => isAlliedNode(node));
    case "allEnemies":
      return diagram.nodes.filter((node) => isEnemyNode(node));
    case "friendlyHero":
      return diagram.nodes.filter((node) => isAlliedNode(node) && node.kind === "hero");
    case "enemyHero":
      return diagram.nodes.filter((node) => isEnemyNode(node) && node.kind === "hero");
    default:
      return [];
  }
}

function getPreviewTargetsForTargetSpec(
  diagram: ProofDiagram,
  anchorNodeId: string,
  targetSpec: TargetSpec,
  interpretation: InterpretedTargetSpec
): PreviewTarget[] {
  const targets = filterNodesForInterpretedTarget(targetSpec, interpretation, getCandidateNodes(diagram, anchorNodeId, targetSpec));

  return targets
    .filter((target) => target.id !== anchorNodeId)
    .map((target) => ({
      nodeId: target.id,
      emphasis: "legal" as const,
      reason: interpretation.renderedLabel
    }));
}

function getOrderedAlliedSpaces(diagram: ProofDiagram, adapter: TopologyAdapter): ProofNode[] {
  const order = new Map(adapter.alliedSpaceOrder.map((nodeId, index) => [nodeId, index]));

  return diagram.nodes
    .filter((node) => isAlliedNode(node) && node.kind === "space")
    .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
}

function getPreviewTargetsForSummon(
  diagram: ProofDiagram,
  anchorNodeId: string,
  effect: Extract<Effect, { kind: "summonToken" }>,
  adapter: TopologyAdapter
): PreviewTarget[] {
  const interpretation = adapter.summonInterpretations[effect.position];

  if (effect.position === "sameLane") {
    const anchor = diagram.nodes.find((node) => node.id === anchorNodeId);

    if (anchor && anchor.kind === "space" && anchor.occupancy === "empty") {
      return [
        {
          nodeId: anchor.id,
          emphasis: "legal",
          reason: interpretation.label
        }
      ];
    }

    return [];
  }

  const firstOpen = getOrderedAlliedSpaces(diagram, adapter).find((node) => node.occupancy === "empty");

  return firstOpen
    ? [
        {
          nodeId: firstOpen.id,
          emphasis: "legal",
          reason: interpretation.label
        }
      ]
    : [];
}

function renderTargetLabel(targetSpec: TargetSpec, interpretation: InterpretedTargetSpec): string {
  const baseLabel = interpretation.renderedLabel;

  if (!hasFilter(targetSpec, "damaged")) {
    return baseLabel;
  }

  if (baseLabel.includes("occupied")) {
    return baseLabel.replace("occupied ", "damaged ");
  }

  if (baseLabel.startsWith("all ")) {
    return baseLabel.replace("all ", "all damaged ");
  }

  if (baseLabel.startsWith("a ")) {
    return `a damaged ${baseLabel.slice(2)}`;
  }

  if (baseLabel.startsWith("the ")) {
    return `the damaged ${baseLabel.slice(4)}`;
  }

  return `damaged ${baseLabel}`;
}

function renderInterpretedEffect(
  effect: Effect,
  topologyKind: TopologyKind,
  anchorNodeId: string
): InterpretedEffect {
  const adapter = TOPOLOGY_ADAPTERS[topologyKind];
  const diagram = TOPOLOGY_DIAGRAMS[topologyKind];

  if ("target" in effect) {
    const interpretedTarget = interpretTargetSpec(effect.target, adapter);
    const renderedTarget = renderTargetLabel(effect.target, interpretedTarget);
    const previewTargets = getPreviewTargetsForTargetSpec(diagram, anchorNodeId, effect.target, interpretedTarget);
    const explanation: TransformExplanation = {
      term: effect.target.selector,
      canonical: CANONICAL_SELECTOR_LABELS[effect.target.selector],
      transformed: interpretedTarget.renderedLabel,
      note: interpretedTarget.note
    };

    const targetingNotes = [
      interpretedTarget.note,
      `${previewTargets.length} legal target${previewTargets.length === 1 ? "" : "s"} are available for ${interpretedTarget.renderedLabel}.`
    ];

    switch (effect.kind) {
      case "dealDamage":
        return {
          effect,
          renderedText: `Deal ${effect.amount} damage to ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "heal":
        return {
          effect,
          renderedText: `Restore ${effect.amount} health to ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "drawCards":
        return {
          effect,
          renderedText:
            effect.target.selector === "friendlyHero"
              ? `Draw ${effect.amount} card${effect.amount === 1 ? "" : "s"}.`
              : `${renderedTarget} draw ${effect.amount} card${effect.amount === 1 ? "" : "s"}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "grantStatus":
        return {
          effect,
          renderedText: `Give ${STATUS_LABELS[effect.status]} ${effect.amount} to ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "modifyAttack":
        return {
          effect,
          renderedText: `Give ${effect.amount >= 0 ? "+" : ""}${effect.amount} attack to ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "modifyHealth":
        return {
          effect,
          renderedText: `Give ${effect.amount >= 0 ? "+" : ""}${effect.amount} health to ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      case "destroy":
        return {
          effect,
          renderedText: `Destroy ${renderedTarget}.`,
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
      default:
        return {
          effect,
          renderedText: "Do something interesting.",
          previewTargets,
          explanations: [explanation],
          targetingNotes
        };
    }
  }

  const summonInterpretation = adapter.summonInterpretations[effect.position];
  const previewTargets = getPreviewTargetsForSummon(diagram, anchorNodeId, effect, adapter);
  const token = getCardById(effect.tokenCardId);
  const tokenLabel = effect.amount === 1 ? token.name : `${effect.amount} ${pluralize(token.name)}`;

  return {
    effect,
    renderedText: `Summon ${tokenLabel} into ${summonInterpretation.label}.`,
    previewTargets,
    explanations: [
      {
        term: `summon:${effect.position}`,
        canonical: effect.position === "firstEmpty" ? "first empty lane" : "this lane if it is open",
        transformed: summonInterpretation.label,
        note: summonInterpretation.note
      }
    ],
    targetingNotes: [
      summonInterpretation.note,
      previewTargets.length > 0
        ? `The highlighted destination is the actual spawn location for ${summonInterpretation.label}.`
        : `There is no legal spawn destination for ${summonInterpretation.label} in the current proof state.`
    ]
  };
}

function interpretAbility(ability: Ability, topologyKind: TopologyKind, anchorNodeId: string): InterpretedAbility {
  const effects = ability.effects.map((effect) => renderInterpretedEffect(effect, topologyKind, anchorNodeId));

  return {
    ability,
    renderedText: `${TRIGGER_LABELS[ability.trigger]}: ${effects.map((effect) => effect.renderedText).join(" Then ")}`,
    previewTargets: effects.flatMap((effect) => effect.previewTargets),
    explanations: effects.flatMap((effect) => effect.explanations),
    targetingNotes: effects.flatMap((effect) => effect.targetingNotes)
  };
}

function uniqueBy<T>(items: T[], keyForItem: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyForItem(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function getTopologyDiagram(topologyKind: TopologyKind): ProofDiagram {
  return TOPOLOGY_DIAGRAMS[topologyKind];
}

export function getTopologyAdapter(topologyKind: TopologyKind): TopologyAdapter {
  return TOPOLOGY_ADAPTERS[topologyKind];
}

export function renderTopologyCardRules(card: CardDefinition, topologyKind: TopologyKind, anchorNodeId?: string): string[] {
  const diagram = getTopologyDiagram(topologyKind);
  const sourceNode = anchorNodeId ?? diagram.nodes.find((node) => node.occupancy === "source")?.id;

  if (!sourceNode) {
    return [];
  }

  return card.abilities.map((ability) => interpretAbility(ability, topologyKind, sourceNode).renderedText);
}

export function getTopologyProofResult(card: CardDefinition, topologyKind: TopologyKind, anchorNodeId: string): TopologyProofResult {
  const diagram = getTopologyDiagram(topologyKind);
  const interpretedAbilities = card.abilities.map((ability) => interpretAbility(ability, topologyKind, anchorNodeId));

  const previewTargets = uniqueBy(
    [
      {
        nodeId: anchorNodeId,
        emphasis: "source" as const,
        reason: "Source position"
      },
      ...interpretedAbilities.flatMap((ability) => ability.previewTargets)
    ],
    (target) => `${target.nodeId}:${target.emphasis}:${target.reason}`
  );

  const transform = uniqueBy(
    interpretedAbilities.flatMap((ability) => ability.explanations),
    (entry) => `${entry.term}:${entry.transformed}`
  );

  const targetingNotes = uniqueBy(
    [
      ...interpretedAbilities.flatMap((ability) => ability.targetingNotes),
      `${previewTargets.filter((target) => target.emphasis === "legal").length} legal target${
        previewTargets.filter((target) => target.emphasis === "legal").length === 1 ? "" : "s"
      } are highlighted on the active topology diagram.`
    ],
    (note) => note
  );

  return {
    topologyKind,
    displayName: TOPOLOGY_ADAPTERS[topologyKind].displayName,
    diagram,
    canonicalRules: renderCanonicalCardRules(card),
    renderedRules: interpretedAbilities.map((ability) => ability.renderedText),
    canonicalPayload: card,
    transform,
    previewTargets,
    targetingNotes,
    anchorNodeId
  };
}
