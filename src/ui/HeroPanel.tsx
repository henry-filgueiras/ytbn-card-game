interface HeroPanelProps {
  label: string;
  health: number;
  maxHealth: number;
  energy?: number;
  maxEnergy?: number;
  deckCount: number;
  handCount: number;
  discardCount: number;
  targetable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function HeroPanel({
  label,
  health,
  maxHealth,
  energy,
  maxEnergy,
  deckCount,
  handCount,
  discardCount,
  targetable = false,
  selected = false,
  onClick
}: HeroPanelProps) {
  return (
    <button
      type="button"
      className={`hero-panel${targetable ? " is-targetable" : ""}${selected ? " is-selected" : ""}`}
      onClick={onClick}
    >
      <div className="hero-panel__title">{label}</div>
      <div className="hero-panel__stats">
        <span>Health {health}/{maxHealth}</span>
        {energy != null && maxEnergy != null ? <span>Energy {energy}/{maxEnergy}</span> : null}
      </div>
      <div className="hero-panel__meta">
        <span>Deck {deckCount}</span>
        <span>Hand {handCount}</span>
        <span>Discard {discardCount}</span>
      </div>
    </button>
  );
}
