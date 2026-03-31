import type { GameModeDefinition } from "../game/modes";

interface ModeConceptPanelProps {
  mode: GameModeDefinition;
}

export function ModeConceptPanel({ mode }: ModeConceptPanelProps) {
  return (
    <>
      <section className="inspector surface-panel" data-surface="semantic-shifts">
        <div className="section-heading">
          <h2>Semantic Shifts</h2>
          <span>How topology changes card meaning</span>
        </div>

        <div className="concept-list">
          {mode.semanticShifts.map((shift) => (
            <article key={shift.term} className="concept-card">
              <div className="concept-card__term">{shift.term}</div>
              <div className="concept-card__copy">
                <strong>Baseline</strong>
                <span>{shift.duelMeaning}</span>
              </div>
              <div className="concept-card__copy">
                <strong>In {mode.name}</strong>
                <span>{shift.modeMeaning}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="inspector surface-panel" data-surface="rituals">
        <div className="section-heading">
          <h2>Ritual Windows</h2>
          <span>Timing-sensitive concepts for this topology</span>
        </div>

        <div className="ritual-note">
          These ritual ideas are design sketches for the next engine layer. They are not wired into live gameplay yet,
          but they are meant to be first-class rules concepts rather than pure visual flair.
        </div>

        <div className="ritual-grid">
          {mode.ritualIdeas.map((ritual) => (
            <article key={ritual.name} className="ritual-card">
              <div className="ritual-card__header">
                <strong>{ritual.name}</strong>
                <span>{ritual.cadence}</span>
              </div>
              <div className="ritual-card__syntax">{ritual.syntax}</div>
              <p>{ritual.gameplay}</p>
              <div className="ritual-card__tension">
                <strong>Tension:</strong> {ritual.tension}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
