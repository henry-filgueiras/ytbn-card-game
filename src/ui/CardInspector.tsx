import { renderCardRules } from "../game/text";
import type { CardDefinition } from "../game/types";

interface CardInspectorProps {
  card: CardDefinition | null;
  emptyMessage?: string;
}

export function CardInspector({
  card,
  emptyMessage = "Select a card in hand or a unit on the board to inspect it."
}: CardInspectorProps) {
  return (
    <section className="inspector surface-panel" data-surface="inspector">
      <div className="section-heading">
        <h2>Inspector</h2>
        <span>Rendered rules + semantic data</span>
      </div>

      {card ? (
        <>
          <div
            className={`inspector-card faction-${card.faction}`}
            data-faction={card.faction}
            data-card-kind={card.kind}
          >
            <div className="inspector-card__title">
              <div>
                <strong>{card.name}</strong>
                <div className="inspector-card__meta">
                  {card.kind === "unit" ? `${card.attack}/${card.health} unit` : "spell"} · cost {card.cost}
                </div>
              </div>
              <span>{card.faction}</span>
            </div>
            <div className="inspector-card__rules">
              {renderCardRules(card).map((rule) => (
                <div key={rule}>{rule}</div>
              ))}
            </div>
          </div>

          <pre className="semantic-json">{JSON.stringify(card, null, 2)}</pre>
        </>
      ) : (
        <div className="empty-panel">{emptyMessage}</div>
      )}
    </section>
  );
}
