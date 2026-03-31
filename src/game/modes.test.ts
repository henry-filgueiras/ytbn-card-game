import { describe, expect, it } from "vitest";
import { GAME_MODES, getGameModeById } from "./modes";

describe("game modes", () => {
  it("defines four distinct mode shells", () => {
    expect(GAME_MODES).toHaveLength(4);
    expect(new Set(GAME_MODES.map((mode) => mode.id)).size).toBe(4);
  });

  it("keeps duel as the playable mode and gives every mode ritual concepts", () => {
    const duel = getGameModeById("duel");

    expect(duel.support).toBe("playable");

    for (const mode of GAME_MODES) {
      expect(mode.boardSections.length).toBeGreaterThan(0);
      expect(mode.semanticShifts.length).toBeGreaterThan(0);
      expect(mode.ritualIdeas.length).toBeGreaterThan(0);
      expect(mode.seats.length).toBeGreaterThan(0);
    }
  });
});
