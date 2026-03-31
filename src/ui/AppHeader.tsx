import type { ReactNode } from "react";

interface AppHeaderProps {
  title: string;
  description: string;
  badge?: string;
  scene: "landing" | "duel" | "sandbox";
  actions?: ReactNode;
}

export function AppHeader({ title, description, badge, scene, actions }: AppHeaderProps) {
  return (
    <header className="topbar surface-panel surface-panel--hero" data-scene={scene} data-surface="header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="topbar__actions">
        {badge ? (
          <div className="deck-chip" data-surface="badge">
            {badge}
          </div>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
