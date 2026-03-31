import { getCardById } from "../data/cards";
import type { UnitInstance } from "../game/types";

interface BoardUnitProps {
  unit: UnitInstance;
  selected?: boolean;
  targetable?: boolean;
  badges?: string[];
  footer?: string;
  onClick?: () => void;
}

const statusLabels: Record<string, string> = {
  poisoned: "Poison",
  stunned: "Stun",
  shielded: "Shield",
  burning: "Burn"
};

export function BoardUnit({ unit, selected = false, targetable = false, badges = [], footer, onClick }: BoardUnitProps) {
  const card = getCardById(unit.cardId);
  const activeStatuses = Object.entries(unit.statuses).filter(([, stacks]) => (stacks ?? 0) > 0);

  return (
    <button
      type="button"
      className={`board-unit faction-${card.faction}${selected ? " is-selected" : ""}${targetable ? " is-targetable" : ""}`}
      onClick={onClick}
      data-faction={card.faction}
      data-owner={unit.ownerId}
      data-selected={selected ? "true" : "false"}
      data-targetable={targetable ? "true" : "false"}
    >
      <div className="board-unit__name">{unit.name}</div>
      <div className="board-unit__stats">
        <span>ATK {unit.attack}</span>
        <span>HP {unit.health}/{unit.maxHealth}</span>
      </div>
      {badges.length > 0 ? (
        <div className="board-unit__tags">
          {badges.map((badge) => (
            <span key={badge} className="status-pill status-pill--hint">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {activeStatuses.length > 0 ? (
        <div className="board-unit__statuses">
          {activeStatuses.map(([status, stacks]) => (
            <span key={status} className="status-pill">
              {statusLabels[status]} {stacks}
            </span>
          ))}
        </div>
      ) : (
        <div className="board-unit__statuses board-unit__statuses--empty">No statuses</div>
      )}
      {footer ? <div className="board-unit__footer">{footer}</div> : null}
    </button>
  );
}
