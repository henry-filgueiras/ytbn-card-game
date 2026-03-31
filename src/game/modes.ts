export const GAME_MODE_IDS = ["duel", "raidBoss", "freeForAll", "twoVsTwo"] as const;
export type GameModeId = (typeof GAME_MODE_IDS)[number];

export type GameModeSupport = "playable" | "topologyPreview";
export type SeatAccent = "ally" | "enemy" | "boss" | "rival";
export type BoardSectionEmphasis = "default" | "boss" | "shared";

export interface ModeSeatDefinition {
  id: string;
  label: string;
  role: string;
  team: string;
  accent: SeatAccent;
  health: number;
  deckLabel: string;
  laneLabels: string[];
  note: string;
}

export interface ModeBoardSection {
  id: string;
  title: string;
  note: string;
  seatIds: string[];
  emphasis?: BoardSectionEmphasis;
}

export interface ModeFeature {
  label: string;
  description: string;
}

export interface SemanticShift {
  term: string;
  duelMeaning: string;
  modeMeaning: string;
}

export interface RitualIdea {
  name: string;
  cadence: string;
  syntax: string;
  gameplay: string;
  tension: string;
}

export interface GameModeDefinition {
  id: GameModeId;
  name: string;
  strapline: string;
  description: string;
  support: GameModeSupport;
  playerCountLabel: string;
  topologyLabel: string;
  launchLabel: string;
  modeNote: string;
  seats: ModeSeatDefinition[];
  boardSections: ModeBoardSection[];
  topologyFeatures: ModeFeature[];
  semanticShifts: SemanticShift[];
  ritualIdeas: RitualIdea[];
}

export const GAME_MODES: GameModeDefinition[] = [
  {
    id: "duel",
    name: "Lane Duel",
    strapline: "The current fully playable prototype.",
    description:
      "Classic mirrored lanes with semantic cards, automatic combat at end of turn, and full card inspection.",
    support: "playable",
    playerCountLabel: "1v1",
    topologyLabel: "Mirrored three-lane battlefield",
    launchLabel: "Launch Playable Match",
    modeNote: "This is the live vertical slice. All cards, targeting, combat, AI, and the inspector are active here.",
    seats: [
      {
        id: "player",
        label: "You",
        role: "Primary commander",
        team: "Solo",
        accent: "ally",
        health: 20,
        deckLabel: "Ember Rush",
        laneLabels: ["Left lane", "Center lane", "Right lane"],
        note: "Deploy into empty lanes, then let end-step combat resolve automatically."
      },
      {
        id: "ai",
        label: "AI Rival",
        role: "Opposing commander",
        team: "Solo",
        accent: "enemy",
        health: 20,
        deckLabel: "Verdant Ward",
        laneLabels: ["Left lane", "Center lane", "Right lane"],
        note: "Mirror structure keeps selectors like opposingUnitThisLane easy to read."
      }
    ],
    boardSections: [
      {
        id: "duel-opposition",
        title: "Opposition",
        note: "Each lane points directly across the table.",
        seatIds: ["ai"]
      },
      {
        id: "duel-allied",
        title: "Command Row",
        note: "Your three lanes form a simple baseline for the semantic system.",
        seatIds: ["player"]
      }
    ],
    topologyFeatures: [
      {
        label: "Three mirrored lanes",
        description: "The cleanest test bed for selectors, lane targeting, and automatic combat."
      },
      {
        label: "Hidden dead turns",
        description: "Auto-end only kicks in after a real play, so empty turns stay concealed."
      },
      {
        label: "Forecasted combat",
        description: "The UI can explain the coming lane results before you commit to ending turn."
      }
    ],
    semanticShifts: [
      {
        term: "chosenEnemy",
        duelMeaning: "Any enemy unit or hero on the far side.",
        modeMeaning: "No remap needed here. This is the baseline meaning."
      },
      {
        term: "opposingUnitThisLane",
        duelMeaning: "The mirrored occupant directly across from the source lane.",
        modeMeaning: "Serves as the reference case for more exotic topologies."
      },
      {
        term: "allEnemies",
        duelMeaning: "Enemy hero plus every enemy unit currently in play.",
        modeMeaning: "Keeps sweepers readable before team and political modes complicate the set."
      }
    ],
    ritualIdeas: [
      {
        name: "Wind-Up Spell",
        cadence: "2-beat self-timed cast",
        syntax: "ritual wind-up [2 beats] => next spell gets +1 magnitude",
        gameplay: "Give slow combo decks a way to bank timing skill into future semantic effects.",
        tension: "If the player flinches or spends the card early, the ritual fizzles."
      },
      {
        name: "Interrupt Beat",
        cadence: "0.8s response window",
        syntax: "interrupt [0.8s after cast] => counter only onPlay verbs",
        gameplay: "Turns the end of a cast into a readable reaction test rather than a pure stack battle.",
        tension: "Fast reactions matter, but only inside a clearly telegraphed timing window."
      },
      {
        name: "Afterimage Counter",
        cadence: "Commit during attack telegraph",
        syntax: "afterimage [during attack tell] => retarget one attacker",
        gameplay: "Lets timing-sensitive defense live inside combat instead of only in main phase.",
        tension: "Mistiming burns the resource and leaves the lane unchanged."
      }
    ]
  },
  {
    id: "raidBoss",
    name: "Raid Boss Engagement",
    strapline: "One commander against a coordinated table of challengers.",
    description:
      "A commander-style 1-vs-N board where the boss owns broad threat sectors and the raiders each bring smaller personal formations.",
    support: "topologyPreview",
    playerCountLabel: "1v3",
    topologyLabel: "Boss sectors above staggered raider pods",
    launchLabel: "Open Topology Sandbox",
    modeNote: "This board view is a semantic/topology prototype for now. The existing engine is still duel-only under the hood.",
    seats: [
      {
        id: "boss",
        label: "Ancient Sovereign",
        role: "Raid boss",
        team: "Boss",
        accent: "boss",
        health: 48,
        deckLabel: "Fortress Core",
        laneLabels: ["Siege left", "Outer gate", "Heart chamber", "Inner gate", "Siege right"],
        note: "The boss stretches across multiple sectors and can convert telegraphs into raid-wide pressure."
      },
      {
        id: "vanguard",
        label: "Vanguard",
        role: "Frontline raider",
        team: "Raid",
        accent: "ally",
        health: 18,
        deckLabel: "Breaker Kit",
        laneLabels: ["Intercept", "Support"],
        note: "Takes the first hit, pins sectors, and opens windows for allied rituals."
      },
      {
        id: "arcanist",
        label: "Arcanist",
        role: "Backline raider",
        team: "Raid",
        accent: "ally",
        health: 16,
        deckLabel: "Pulse Kit",
        laneLabels: ["Channel", "Relay"],
        note: "Converts timing accuracy into shields, counters, and shared payoff spells."
      },
      {
        id: "skirmisher",
        label: "Skirmisher",
        role: "Flank raider",
        team: "Raid",
        accent: "ally",
        health: 17,
        deckLabel: "Spoil Kit",
        laneLabels: ["Ambush", "Recovery"],
        note: "Moves pressure sideways, steals exposed windows, and punishes overcommitted boss sectors."
      }
    ],
    boardSections: [
      {
        id: "raid-boss",
        title: "Boss Bastion",
        note: "The boss owns a longer top row, which makes lane-linked selectors feel like sector control rather than simple mirroring.",
        seatIds: ["boss"],
        emphasis: "boss"
      },
      {
        id: "raid-line",
        title: "Raid Line",
        note: "Each raider keeps a compact pod, then collaborates through rituals and shared threat windows.",
        seatIds: ["vanguard", "arcanist", "skirmisher"],
        emphasis: "shared"
      }
    ],
    topologyFeatures: [
      {
        label: "Five boss sectors",
        description: "The raid boss can occupy more spatial real estate than any single challenger."
      },
      {
        label: "Small raider pods",
        description: "Each challenger gets a compact personal board, which forces cooperation rather than solo completeness."
      },
      {
        label: "Shared wipe meter",
        description: "Raid-wide punishment can be telegraphed as a visible meter that rituals try to soften or redirect."
      }
    ],
    semanticShifts: [
      {
        term: "chosenEnemy",
        duelMeaning: "Pick a single enemy unit or hero.",
        modeMeaning: "Raiders may pick the boss or an exposed add, while the boss can pick any challenger or sector-linked unit."
      },
      {
        term: "adjacentAlly",
        duelMeaning: "Friendly units in neighboring lanes.",
        modeMeaning: "For raiders, adjacency can include neighboring seats in raid order or linked support lanes inside a pod."
      },
      {
        term: "allEnemies",
        duelMeaning: "The entire opposing side.",
        modeMeaning: "Boss sweeps can hit the whole raid, while raid cards may split between the boss core and spawned adds."
      }
    ],
    ritualIdeas: [
      {
        name: "Telegraph Break",
        cadence: "3.0s shared response window",
        syntax: "ritual telegraph-break [3.0s, 2 raiders] => cancel one boss sector sweep",
        gameplay: "When the boss reveals a sector attack, two raiders can commit in time to shut that line down.",
        tension: "The window is generous enough to coordinate, but short enough that hesitation still matters."
      },
      {
        name: "Relay Channel",
        cadence: "Held channel into teammate finish",
        syntax: "relay channel [hold + teammate release] => grant Shielded 2 to all allies in one pod",
        gameplay: "One raider starts the ritual and another closes it, making latency and cooperation part of defense.",
        tension: "Dropping the hold early or finishing late causes only a partial shield."
      },
      {
        name: "Last-Stand Redirect",
        cadence: "1.5s emergency cue",
        syntax: "redirect [1.5s on lethal tell] => move boss damage to prepared intercept lane",
        gameplay: "Creates dramatic clutch saves that feel like boss-fight mechanics, not just card text.",
        tension: "If nobody prepared the intercept lane ahead of time, the ritual window is wasted."
      }
    ]
  },
  {
    id: "freeForAll",
    name: "Triad Skirmish",
    strapline: "Three commanders in a political triangle.",
    description:
      "A 1v1v1 board where each seat has two rival-facing flanks and one central economy lane, making diplomacy and threat geometry matter.",
    support: "topologyPreview",
    playerCountLabel: "1v1v1",
    topologyLabel: "Triangular rivalry with directional flanks",
    launchLabel: "Open Topology Sandbox",
    modeNote: "This view focuses on how selectors and threat lines mutate once there is no single global opponent.",
    seats: [
      {
        id: "north",
        label: "North Court",
        role: "Commander A",
        team: "Solo",
        accent: "rival",
        health: 20,
        deckLabel: "Pressure Deck",
        laneLabels: ["West flank", "Cache lane", "East flank"],
        note: "Must decide which rival to pressure without overexposing the opposite flank."
      },
      {
        id: "west",
        label: "West Court",
        role: "Commander B",
        team: "Solo",
        accent: "rival",
        health: 20,
        deckLabel: "Control Deck",
        laneLabels: ["North flank", "Cache lane", "East flank"],
        note: "Can pivot from control into opportunism whenever the third seat overcommits."
      },
      {
        id: "east",
        label: "East Court",
        role: "Commander C",
        team: "Solo",
        accent: "rival",
        health: 20,
        deckLabel: "Tempo Deck",
        laneLabels: ["North flank", "Cache lane", "West flank"],
        note: "Thrives on tempo swings and punishing truce turns between the other two players."
      }
    ],
    boardSections: [
      {
        id: "triad-apex",
        title: "Apex Seat",
        note: "The top seat still needs to watch two threat directions, not one.",
        seatIds: ["north"]
      },
      {
        id: "triad-base",
        title: "Counterweights",
        note: "The lower seats form the second half of the triangle, creating constant political tension.",
        seatIds: ["west", "east"]
      }
    ],
    topologyFeatures: [
      {
        label: "Two rival-facing flanks",
        description: "A lane can imply a specific rival rather than a universal enemy side."
      },
      {
        label: "Shared cache lane",
        description: "Center pressure can be about tempo, cards, or objective control rather than direct damage."
      },
      {
        label: "Rotating threat geometry",
        description: "The strongest board becomes the table target, so semantics interact with politics."
      }
    ],
    semanticShifts: [
      {
        term: "chosenEnemy",
        duelMeaning: "Pick from the one opposing side.",
        modeMeaning: "Pick from either rival, which turns many cards into political statements."
      },
      {
        term: "opposingUnitThisLane",
        duelMeaning: "The mirrored unit across the lane.",
        modeMeaning: "The linked rival depends on which flank the source lane belongs to."
      },
      {
        term: "allEnemies",
        duelMeaning: "Every card on the far side.",
        modeMeaning: "Hits both rival tables, so mass effects become table-shaping events."
      }
    ],
    ritualIdeas: [
      {
        name: "Knife-Edge Pact",
        cadence: "2-player response chain",
        syntax: "pact [2.2s, any 2 rivals] => both draw 1, third rival gains initiative",
        gameplay: "A temporary truce can buy cards, but it hands tempo to the uninvolved player.",
        tension: "Players must read each other quickly or the pact simply never lands."
      },
      {
        name: "Ambush Beat",
        cadence: "1.0s post-end-step window",
        syntax: "ambush [1.0s after rival ends] => shift one flank unit clockwise",
        gameplay: "Lets quick reactions reshape the triangle after someone signals a weak side.",
        tension: "Too late and the board locks for the next cycle."
      },
      {
        name: "Priority Snatch",
        cadence: "Shared neutral-objective cue",
        syntax: "snatch [first valid commit] => claim cache lane objective",
        gameplay: "Turns neutral spawns into a race without requiring full real-time combat.",
        tension: "Everyone sees the cue, but only one player gets the clean first claim."
      }
    ]
  },
  {
    id: "twoVsTwo",
    name: "Twinfront Clash",
    strapline: "Partner tactics with a shared frontline.",
    description:
      "A 2v2 topology where teammates keep private flanks but overlap on a shared middle front, encouraging support cards and coordinated turns.",
    support: "topologyPreview",
    playerCountLabel: "2v2",
    topologyLabel: "Partner pods bridged by a shared center",
    launchLabel: "Open Topology Sandbox",
    modeNote: "This mode highlights how ally selectors and shared-lane semantics could reshape both deckbuilding and timing play.",
    seats: [
      {
        id: "enemyLeft",
        label: "Enemy Left",
        role: "Opposing partner",
        team: "Enemy team",
        accent: "enemy",
        health: 20,
        deckLabel: "Siege Deck",
        laneLabels: ["Far flank", "Shared vanguard", "Support pocket"],
        note: "Can funnel pressure into the shared center or attack the open flank on their side."
      },
      {
        id: "enemyRight",
        label: "Enemy Right",
        role: "Opposing partner",
        team: "Enemy team",
        accent: "enemy",
        health: 20,
        deckLabel: "Tempo Deck",
        laneLabels: ["Support pocket", "Shared vanguard", "Far flank"],
        note: "Works best when its support pocket feeds the shared middle before switching back outward."
      },
      {
        id: "allyLeft",
        label: "Ally Left",
        role: "Friendly partner",
        team: "Your team",
        accent: "ally",
        health: 20,
        deckLabel: "Shield Deck",
        laneLabels: ["Far flank", "Shared vanguard", "Support pocket"],
        note: "Protects the team by stabilizing center and gifting buffs into the partner's setup."
      },
      {
        id: "allyRight",
        label: "Ally Right",
        role: "You",
        team: "Your team",
        accent: "ally",
        health: 20,
        deckLabel: "Burst Deck",
        laneLabels: ["Support pocket", "Shared vanguard", "Far flank"],
        note: "Pairs burst damage with timing windows that reward synchronized commitments."
      }
    ],
    boardSections: [
      {
        id: "twinfront-enemy",
        title: "Enemy Pair",
        note: "The opposing team shares the same pressure geometry you do.",
        seatIds: ["enemyLeft", "enemyRight"]
      },
      {
        id: "twinfront-allies",
        title: "Friendly Pair",
        note: "Private flanks sit on the outside while both teammates touch the shared middle.",
        seatIds: ["allyLeft", "allyRight"],
        emphasis: "shared"
      }
    ],
    topologyFeatures: [
      {
        label: "Shared center lane",
        description: "Both teammates can feed the middle, so support verbs and timing chains gain value."
      },
      {
        label: "Private outer flanks",
        description: "Partners still retain individual pressure lines and recovery pockets."
      },
      {
        label: "Teamwide ally targeting",
        description: "Cards that help chosenAlly or adjacentAlly become much more interesting than in duel."
      }
    ],
    semanticShifts: [
      {
        term: "chosenAlly",
        duelMeaning: "Usually self or a unit on your own side.",
        modeMeaning: "Can also point across to your partner, opening true support and relay cards."
      },
      {
        term: "adjacentAlly",
        duelMeaning: "Neighboring lanes you control.",
        modeMeaning: "Can bridge into the shared center or even into the partner seat if the formation touches there."
      },
      {
        term: "allEnemies",
        duelMeaning: "One enemy board and hero.",
        modeMeaning: "Both enemy commanders plus the full joint frontline."
      }
    ],
    ritualIdeas: [
      {
        name: "Relay Cast",
        cadence: "Starter plus finisher",
        syntax: "relay cast [2.4s, partner finish] => combine both card adjectives on one effect",
        gameplay: "One teammate starts the ritual and the other lands the payoff, making true co-op language possible.",
        tension: "The finisher must arrive on time or the effect resolves as the weaker solo version."
      },
      {
        name: "Crossguard",
        cadence: "Simultaneous confirm",
        syntax: "crossguard [same-beat confirm] => Shielded 1 to both shared-vanguard units",
        gameplay: "Creates a visible moment of coordination that protects the team's central lane.",
        tension: "If only one player confirms, the shield lands on just one side and wastes tempo."
      },
      {
        name: "Pinch Signal",
        cadence: "Marked target window",
        syntax: "pinch [1.2s, shared target] => marked enemy takes +2 from both partners this turn",
        gameplay: "Turns quick communication into a focused takedown on the shared front.",
        tension: "If partners disagree on the mark, neither gets the bonus."
      }
    ]
  }
];

export function getGameModeById(modeId: GameModeId): GameModeDefinition {
  const mode = GAME_MODES.find((candidate) => candidate.id === modeId);

  if (!mode) {
    throw new Error(`Unknown game mode: ${modeId}`);
  }

  return mode;
}
