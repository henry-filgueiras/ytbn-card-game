import { useMemo } from "react";
import type { PreviewTarget, ProofDiagram } from "../game/topology";

interface TopologyDiagramProps {
  diagram: ProofDiagram;
  previewTargets: PreviewTarget[];
  anchorNodeId: string;
}

export function TopologyDiagram({ diagram, previewTargets, anchorNodeId }: TopologyDiagramProps) {
  const targetMap = useMemo(() => new Map(previewTargets.map((target) => [target.nodeId, target])), [previewTargets]);

  return (
    <div className="proof-diagram">
      <svg className="proof-diagram__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {diagram.edges.map((edge) => {
          const from = diagram.nodes.find((node) => node.id === edge.from);
          const to = diagram.nodes.find((node) => node.id === edge.to);

          if (!from || !to) {
            return null;
          }

          const edgeIsActive =
            (edge.from === anchorNodeId && targetMap.has(edge.to)) ||
            (edge.to === anchorNodeId && targetMap.has(edge.from));

          return (
            <line
              key={`${edge.kind}-${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`proof-diagram__edge proof-diagram__edge--${edge.kind}${edgeIsActive ? " is-active" : ""}`}
            />
          );
        })}
      </svg>

      {diagram.nodes.map((node) => {
        const preview = targetMap.get(node.id);
        const isSource = node.id === anchorNodeId;

        return (
          <div
            key={node.id}
            className={`proof-node proof-node--${node.kind} proof-node--${node.team} proof-node--${node.occupancy}${
              preview ? ` is-${preview.emphasis}` : ""
            }${node.damaged ? " is-damaged" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="proof-node__short">{node.shortLabel}</div>
            <div className="proof-node__label">{node.label}</div>
            <div className="proof-node__meta">
              <span>{node.kind === "hero" ? "Hero" : node.occupancy === "empty" ? "Open" : isSource ? "Source" : "Occupied"}</span>
              {node.damaged ? <span>Damaged</span> : null}
              {preview && !isSource ? <span>{preview.reason}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
