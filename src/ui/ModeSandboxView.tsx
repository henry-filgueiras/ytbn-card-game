import type { GameModeDefinition } from "../game/modes";
import { CardDesigner } from "./CardDesigner";
import { ModeConceptPanel } from "./ModeConceptPanel";
import { ModeTopologyBoard } from "./ModeTopologyBoard";

interface ModeSandboxViewProps {
  mode: GameModeDefinition;
}

export function ModeSandboxView({ mode }: ModeSandboxViewProps) {
  return (
    <main className="layout" data-scene="sandbox">
      <ModeTopologyBoard mode={mode} />

      <aside className="side-panel" data-surface="sidebar">
        <ModeConceptPanel mode={mode} />
        <CardDesigner seedCard={null} />
      </aside>
    </main>
  );
}
