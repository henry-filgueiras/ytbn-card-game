export const PLAYER_IDS = ["player", "ai"] as const;
export type PlayerId = (typeof PLAYER_IDS)[number];

export type Winner = PlayerId | "draw" | null;

export type Trigger = "onPlay" | "onDeath" | "startOfTurn" | "endOfTurn" | "onAttack";

export type Status = "poisoned" | "stunned" | "shielded" | "burning";

export type Selector =
  | "self"
  | "chosenAlly"
  | "chosenEnemy"
  | "randomEnemy"
  | "adjacentAlly"
  | "opposingUnitThisLane"
  | "allAllies"
  | "allEnemies"
  | "friendlyHero"
  | "enemyHero";

export type TargetFilter = "unit" | "hero" | "damaged";

export interface TargetSpec {
  selector: Selector;
  filters?: TargetFilter[];
  optional?: boolean;
}

export type Effect =
  | {
      kind: "dealDamage";
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "heal";
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "drawCards";
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "summonToken";
      tokenCardId: string;
      amount: number;
      position: "firstEmpty" | "sameLane";
    }
  | {
      kind: "grantStatus";
      status: Status;
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "modifyAttack";
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "modifyHealth";
      amount: number;
      target: TargetSpec;
    }
  | {
      kind: "destroy";
      target: TargetSpec;
    };

export interface Ability {
  trigger: Trigger;
  effects: Effect[];
}

export type Faction = "ember" | "verdant" | "neutral" | "token";

interface BaseCardDefinition {
  id: string;
  name: string;
  faction: Faction;
  cost: number;
  abilities: Ability[];
  token?: boolean;
}

export interface UnitCardDefinition extends BaseCardDefinition {
  kind: "unit";
  attack: number;
  health: number;
}

export interface SpellCardDefinition extends BaseCardDefinition {
  kind: "spell";
}

export type CardDefinition = UnitCardDefinition | SpellCardDefinition;

export interface HeroState {
  health: number;
  maxHealth: number;
}

export interface UnitInstance {
  instanceId: string;
  cardId: string;
  name: string;
  ownerId: PlayerId;
  lane: number;
  attack: number;
  health: number;
  maxHealth: number;
  statuses: Partial<Record<Status, number>>;
  summonedOnTurn: number;
}

export interface PlayerState {
  id: PlayerId;
  deck: string[];
  hand: string[];
  discard: string[];
  hero: HeroState;
  energy: number;
  maxEnergy: number;
  lanes: Array<UnitInstance | null>;
}

export interface GameState {
  currentPlayer: PlayerId;
  turnNumber: number;
  cardsPlayedThisTurn: number;
  winner: Winner;
  log: string[];
  rngState: number;
  nextUnitId: number;
  players: Record<PlayerId, PlayerState>;
}

export interface PlayCardParams {
  handIndex: number;
  lane?: number;
  targetId?: string;
}

export interface PlayPreview {
  requiresLane: boolean;
  laneOptions: number[];
  requiresTarget: boolean;
  targetOptions: string[];
  chosenTargetSpec: TargetSpec | null;
  playable: boolean;
}

export interface ResolutionContext {
  sourcePlayerId: PlayerId;
  sourceCard: CardDefinition;
  sourceLane?: number;
  sourceUnitId?: string;
  sourceUnitSnapshot?: UnitInstance;
  chosenTargetId?: string;
  attackTargetId?: string;
}

export interface DeckDefinition {
  id: string;
  name: string;
  description: string;
  cards: string[];
}

export type CombatForecastKind = "empty" | "summoningSick" | "stunned" | "duel" | "hero";

export interface CombatForecast {
  lane: number;
  kind: CombatForecastKind;
  summary: string;
  note?: string;
  attackerId?: string;
  defenderId?: string;
  attackerName?: string;
  defenderName?: string;
  damageToDefender?: number;
  damageToAttacker?: number;
  attackerWillDie?: boolean;
  defenderWillDie?: boolean;
}
