interface EventLogPanelProps {
  entries: string[];
}

export function EventLogPanel({ entries }: EventLogPanelProps) {
  return (
    <section className="log-panel surface-panel" data-surface="log">
      <div className="section-heading">
        <h2>Event Log</h2>
        <span>Most recent events first</span>
      </div>
      <div className="log-entries">
        {[...entries].reverse().map((entry, index) => (
          <div key={`${entry}-${index}`} className="log-entry">
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
}
