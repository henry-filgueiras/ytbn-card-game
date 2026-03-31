import type { CombatForecast as CombatForecastItem } from "../game/types";

interface CombatForecastProps {
  forecasts: CombatForecastItem[];
}

function outcomeLabel(forecast: CombatForecastItem): string {
  switch (forecast.kind) {
    case "summoningSick":
      return "New";
    case "stunned":
      return "Stunned";
    case "hero":
      return "Face hit";
    case "duel":
      if (forecast.attackerWillDie && forecast.defenderWillDie) {
        return "Trade";
      }

      if (forecast.defenderWillDie) {
        return "Favorable";
      }

      if (forecast.attackerWillDie) {
        return "Risky";
      }

      return "Clash";
    default:
      return "Idle";
  }
}

export function CombatForecast({ forecasts }: CombatForecastProps) {
  return (
    <section className="forecast-panel">
      <div className="inspector__header">
        <h2>Combat Forecast</h2>
        <span>Ending the turn resolves on-attack abilities, then lane combat.</span>
      </div>
      <div className="forecast-grid">
        {forecasts.map((forecast) => (
          <div key={forecast.lane} className={`forecast-card forecast-card--${forecast.kind}`}>
            <div className="forecast-card__header">
              <strong>{["Left", "Center", "Right"][forecast.lane]} lane</strong>
              <span>{outcomeLabel(forecast)}</span>
            </div>
            <div className="forecast-card__summary">{forecast.summary}</div>
            {forecast.note ? <div className="forecast-card__note">{forecast.note}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
