import { useMemo, useState } from "react";
import { PROOF_CARDS } from "../game/proofCards";
import { TOPOLOGY_KINDS, getTopologyProofResult, type TopologyKind } from "../game/topology";
import { renderCanonicalCardRules } from "../game/text";
import { TopologyDiagram } from "./TopologyDiagram";

const TOPOLOGY_LABELS: Record<TopologyKind, string> = {
  laneDuel: "Lane Duel",
  triad: "Triad Skirmish",
  raidBoss: "Raid Boss Engagement",
  twinfront: "Twinfront Clash"
};

export function TopologyProofScreen() {
  const [selectedCardId, setSelectedCardId] = useState(PROOF_CARDS[0].id);
  const [topologyKind, setTopologyKind] = useState<TopologyKind>("laneDuel");

  const selectedProofCard = useMemo(
    () => PROOF_CARDS.find((card) => card.id === selectedCardId) ?? PROOF_CARDS[0],
    [selectedCardId]
  );

  const proof = useMemo(
    () => getTopologyProofResult(selectedProofCard.card, topologyKind, selectedProofCard.anchorByTopology[topologyKind]),
    [selectedProofCard, topologyKind]
  );

  return (
    <main className="proof-layout" data-scene="proof">
      <aside className="proof-column proof-column--cards surface-panel" data-surface="proof-card-palette">
        <div className="section-heading">
          <h2>Canonical Test Cards</h2>
          <span>Choose one payload and watch topology rewrite it.</span>
        </div>

        <div className="proof-card-list">
          {PROOF_CARDS.map((proofCard) => (
            <button
              key={proofCard.id}
              type="button"
              className={`proof-card-picker${proofCard.id === selectedCardId ? " is-selected" : ""}`}
              onClick={() => setSelectedCardId(proofCard.id)}
            >
              <div className="proof-card-picker__title">
                <strong>{proofCard.name}</strong>
                <span>{proofCard.strapline}</span>
              </div>
              <div className="proof-card-picker__syntax">
                {renderCanonicalCardRules(proofCard.card).map((rule) => (
                  <div key={`${proofCard.id}-${rule}`}>{rule}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="proof-column proof-column--diagram surface-panel" data-surface="proof-diagram">
        <div className="section-heading">
          <h2>{proof.displayName}</h2>
          <span>{proof.diagram.subtitle}</span>
        </div>

        <div className="proof-topology-switcher" role="tablist" aria-label="Topology switcher">
          {TOPOLOGY_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`proof-topology-tab${kind === topologyKind ? " is-active" : ""}`}
              onClick={() => setTopologyKind(kind)}
            >
              {TOPOLOGY_LABELS[kind]}
            </button>
          ))}
        </div>

        <TopologyDiagram diagram={proof.diagram} previewTargets={proof.previewTargets} anchorNodeId={proof.anchorNodeId} />

        <div className="proof-legend">
          <span className="proof-legend__item">
            <span className="proof-legend__swatch proof-legend__swatch--source" />
            Source
          </span>
          <span className="proof-legend__item">
            <span className="proof-legend__swatch proof-legend__swatch--target" />
            Legal target
          </span>
          <span className="proof-legend__item">
            <span className="proof-legend__swatch proof-legend__swatch--empty" />
            Open space
          </span>
          <span className="proof-legend__item">
            <span className="proof-legend__swatch proof-legend__swatch--damaged" />
            Damaged occupant
          </span>
        </div>
      </section>

      <aside className="proof-column proof-column--inspector surface-panel" data-surface="proof-inspector">
        <div className="section-heading">
          <h2>Semantic Inspector</h2>
          <span>Canonical payload, topology transform, text, and legality.</span>
        </div>

        <section className="proof-panel-block">
          <div className="proof-panel-block__header">
            <strong>Canonical Payload</strong>
            <span>Root truth</span>
          </div>
          <div className="proof-rule-list">
            {proof.canonicalRules.map((rule) => (
              <div key={rule}>{rule}</div>
            ))}
          </div>
          <details className="proof-details">
            <summary>View payload JSON</summary>
            <pre className="semantic-json">{JSON.stringify(proof.canonicalPayload, null, 2)}</pre>
          </details>
        </section>

        <section className="proof-panel-block">
          <div className="proof-panel-block__header">
            <strong>Topology Transform</strong>
            <span>How terms mutate here</span>
          </div>
          <div className="proof-transform-list">
            {proof.transform.map((item) => (
              <article key={item.term} className="proof-transform-card">
                <div className="proof-transform-card__term">{item.term}</div>
                <div className="proof-transform-card__row">
                  <span>Canonical</span>
                  <strong>{item.canonical}</strong>
                </div>
                <div className="proof-transform-card__row">
                  <span>{proof.displayName}</span>
                  <strong>{item.transformed}</strong>
                </div>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="proof-panel-block">
          <div className="proof-panel-block__header">
            <strong>Rendered Text</strong>
            <span>Human-readable output after topology remap</span>
          </div>
          <div className="proof-rule-list">
            {proof.renderedRules.map((rule) => (
              <div key={rule} className="proof-rule-list__item">
                {rule}
              </div>
            ))}
          </div>
        </section>

        <section className="proof-panel-block">
          <div className="proof-panel-block__header">
            <strong>Targeting Notes</strong>
            <span>Why legality changed</span>
          </div>
          <div className="proof-note-list">
            {proof.targetingNotes.map((note) => (
              <div key={note} className="proof-note-list__item">
                {note}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
