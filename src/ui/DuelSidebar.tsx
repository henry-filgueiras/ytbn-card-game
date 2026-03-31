import type { CardDefinition } from "../game/types";
import { CardDesigner } from "./CardDesigner";
import { CardInspector } from "./CardInspector";
import { EventLogPanel } from "./EventLogPanel";

interface DuelSidebarProps {
  inspectedCard: CardDefinition | null;
  logEntries: string[];
}

export function DuelSidebar({ inspectedCard, logEntries }: DuelSidebarProps) {
  return (
    <aside className="side-panel" data-surface="sidebar">
      <CardInspector card={inspectedCard} />
      <CardDesigner seedCard={inspectedCard} />
      <EventLogPanel entries={logEntries} />
    </aside>
  );
}
