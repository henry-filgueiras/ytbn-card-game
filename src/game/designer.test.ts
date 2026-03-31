import { describe, expect, it } from "vitest";
import { createBlankCardDraft, createDefaultEffect, getDraftBudgetSummary } from "./designer";

describe("card designer budget system", () => {
  it("keeps the default blank draft within budget", () => {
    const draft = createBlankCardDraft();
    const budget = getDraftBudgetSummary(draft);

    expect(budget.maxBudget).toBeGreaterThan(0);
    expect(budget.withinBudget).toBe(true);
    expect(budget.remainingBudget).toBeGreaterThanOrEqual(0);
  });

  it("spends more budget when extra effects are added", () => {
    const draft = createBlankCardDraft();
    const baseBudget = getDraftBudgetSummary(draft);

    draft.abilities[0].effects.push(createDefaultEffect("drawCards"));
    const upgradedBudget = getDraftBudgetSummary(draft);

    expect(upgradedBudget.totalCost).toBeGreaterThan(baseBudget.totalCost);
    expect(upgradedBudget.abilities[0].effects).toHaveLength(2);
  });

  it("flags over-budget drafts when the effect package is too expensive", () => {
    const draft = createBlankCardDraft();
    draft.cost = 1;
    draft.attack = 0;
    draft.health = 1;
    draft.abilities = [
      {
        trigger: "onPlay",
        effects: [
          { kind: "destroy", target: { selector: "chosenEnemy", filters: ["unit"] } },
          { kind: "drawCards", amount: 2, target: { selector: "friendlyHero" } }
        ]
      }
    ];

    const budget = getDraftBudgetSummary(draft);

    expect(budget.withinBudget).toBe(false);
    expect(budget.remainingBudget).toBeLessThan(0);
  });
});
