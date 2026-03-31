import { useMemo } from "react";
import type { GameModeDefinition, ModeSeatDefinition } from "../game/modes";

interface ModeTopologyBoardProps {
  mode: GameModeDefinition;
}

export function ModeTopologyBoard({ mode }: ModeTopologyBoardProps) {
  const seatLookup = useMemo(
    () =>
      Object.fromEntries(mode.seats.map((seat) => [seat.id, seat])) as Record<string, ModeSeatDefinition>,
    [mode.seats]
  );

  return (
    <section className="table-panel surface-panel" data-surface="topology-board">
      <div className="section-heading">
        <h2>{mode.name}</h2>
        <span>{mode.topologyLabel}</span>
      </div>

      <div className="status-bar">
        <div>
          <strong>{mode.playerCountLabel}</strong> ·{" "}
          {mode.support === "playable" ? "Playable engine path" : "Topology sandbox"}
        </div>
        <div>{mode.modeNote}</div>
      </div>

      <div className="topology-board">
        {mode.boardSections.map((section) => (
          <section
            key={section.id}
            className={`topology-board__section topology-board__section--${section.emphasis ?? "default"}`}
            data-topology-section={section.id}
            data-section-emphasis={section.emphasis ?? "default"}
          >
            <div className="topology-board__section-header">
              <strong>{section.title}</strong>
              <span>{section.note}</span>
            </div>

            <div className="topology-board__seat-grid">
              {section.seatIds.map((seatId) => {
                const seat = seatLookup[seatId];

                return (
                  <article
                    key={seat.id}
                    className={`topology-seat topology-seat--${seat.accent}`}
                    data-seat-id={seat.id}
                    data-seat-accent={seat.accent}
                    data-seat-team={seat.team}
                  >
                    <div className="topology-seat__header">
                      <div>
                        <strong>{seat.label}</strong>
                        <div className="topology-seat__meta">
                          {seat.role} · {seat.team}
                        </div>
                      </div>
                      <span className={`topology-seat__badge topology-seat__badge--${seat.accent}`}>
                        {seat.health} HP
                      </span>
                    </div>

                    <div className="topology-seat__deck">{seat.deckLabel}</div>
                    <p className="topology-seat__note">{seat.note}</p>

                    <div className="topology-seat__lanes">
                      {seat.laneLabels.map((laneLabel) => (
                        <div key={`${seat.id}-${laneLabel}`} className="topology-lane">
                          {laneLabel}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mode-feature-grid">
        {mode.topologyFeatures.map((feature) => (
          <article key={feature.label} className="mode-feature-card">
            <strong>{feature.label}</strong>
            <span>{feature.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
