import { GAME_MODES, type GameModeId } from "../game/modes";

interface LandingScreenProps {
  onSelectMode: (modeId: GameModeId) => void;
  onOpenProof: () => void;
}

export function LandingScreen({ onSelectMode, onOpenProof }: LandingScreenProps) {
  return (
    <main className="landing-layout">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-kicker">Semantic rules engine + mode shells</span>
          <h2>Pick a topology, then let the board teach the meaning of the cards.</h2>
          <p>
            The same language kernel can sit inside mirrored duels, raid encounters, political triangles, or shared-team
            battlefields. This screen is the new front door for exploring those shapes.
          </p>
        </div>

        <div className="landing-pillars">
          <article className="landing-pillar">
            <strong>Semantic kernel</strong>
            <span>Triggers, selectors, filters, verbs, and statuses stay canonical across every mode.</span>
          </article>
          <article className="landing-pillar">
            <strong>Topology remaps meaning</strong>
            <span>Terms like chosenEnemy or adjacentAlly become richer once the board stops being purely mirrored.</span>
          </article>
          <article className="landing-pillar">
            <strong>Ritual windows</strong>
            <span>Timing-sensitive concepts can become first-class rules objects rather than pure UI garnish.</span>
          </article>
        </div>
      </section>

      <section className="mode-grid">
        {GAME_MODES.map((mode) => (
          <article
            key={mode.id}
            className={`mode-card mode-card--${mode.support}`}
            data-mode-id={mode.id}
            data-mode-support={mode.support}
          >
            <div className="mode-card__header">
              <div>
                <div className="mode-card__eyebrow">
                  <span>{mode.playerCountLabel}</span>
                  <span>{mode.topologyLabel}</span>
                </div>
                <h3>{mode.name}</h3>
                <p>{mode.strapline}</p>
              </div>
              <span className={`mode-card__status mode-card__status--${mode.support}`}>
                {mode.support === "playable" ? "Playable now" : "Topology preview"}
              </span>
            </div>

            <p className="mode-card__description">{mode.description}</p>

            <div className="mode-card__preview">
              {mode.seats.map((seat) => (
                <div key={seat.id} className={`mode-card__seat mode-card__seat--${seat.accent}`}>
                  <strong>{seat.label}</strong>
                  <span>{seat.laneLabels.length} lanes</span>
                </div>
              ))}
            </div>

            <div className="mode-card__highlights">
              {mode.topologyFeatures.slice(0, 2).map((feature) => (
                <div key={feature.label} className="mode-card__highlight">
                  <strong>{feature.label}</strong>
                  <span>{feature.description}</span>
                </div>
              ))}
            </div>

            <button type="button" className="primary-button" onClick={() => onSelectMode(mode.id)}>
              {mode.launchLabel}
            </button>
          </article>
        ))}
      </section>

      <section className="proof-cta surface-panel" data-surface="proof-cta">
        <div>
          <span className="landing-kicker">Semantic lab surface</span>
          <h3>Topology Proof</h3>
          <p>See the same card mutate across board geometries, with legal targets and human-readable text updating in sync.</p>
        </div>
        <button type="button" className="primary-button" onClick={onOpenProof}>
          Open Topology Proof
        </button>
      </section>
    </main>
  );
}
