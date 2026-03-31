import { renderCardRules } from "../game/text";
import type { CardDefinition } from "../game/types";

interface CardViewProps {
  card: CardDefinition;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
}

export function CardView({ card, selected = false, disabled = false, onClick, label }: CardViewProps) {
  const rules = renderCardRules(card);

  return (
    <button
      type="button"
      className={`card-view faction-${card.faction}${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="card-view__header">
        <span className="card-view__cost">{card.cost}</span>
        <div>
          <div className="card-view__name">{card.name}</div>
          <div className="card-view__meta">
            {card.kind === "unit" ? `${card.attack}/${card.health} unit` : "spell"} · {card.faction}
          </div>
        </div>
      </div>

      <div className="card-view__rules">
        {rules.map((rule) => (
          <div key={rule}>{rule}</div>
        ))}
      </div>

      {label ? <div className="card-view__label">{label}</div> : null}
    </button>
  );
}
