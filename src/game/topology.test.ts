import { describe, expect, it } from "vitest";
import { getProofCardById } from "./proofCards";
import { getTopologyProofResult, renderTopologyCardRules } from "./topology";

describe("topology proof adapters", () => {
  it("renders the same canonical card differently across topologies", () => {
    const card = getProofCardById("ward-ring");
    const duelRules = renderTopologyCardRules(card.card, "laneDuel");
    const raidRules = renderTopologyCardRules(card.card, "raidBoss");

    expect(duelRules[0]).not.toEqual(raidRules[0]);
    expect(duelRules[0]).toContain("adjacent allied lane");
    expect(raidRules[0]).toContain("neighboring allied raid spaces");
  });

  it("changes legal target pools when topology changes", () => {
    const card = getProofCardById("skull-lantern");
    const duel = getTopologyProofResult(card.card, "laneDuel", card.anchorByTopology.laneDuel);
    const triad = getTopologyProofResult(card.card, "triad", card.anchorByTopology.triad);

    const duelLegalTargets = duel.previewTargets.filter((target) => target.emphasis === "legal");
    const triadLegalTargets = triad.previewTargets.filter((target) => target.emphasis === "legal");

    expect(duelLegalTargets.length).toBeLessThan(triadLegalTargets.length);
  });

  it("does not overclaim empty spaces for chosen-enemy previews", () => {
    const card = getProofCardById("skull-lantern");
    const duel = getTopologyProofResult(card.card, "laneDuel", card.anchorByTopology.laneDuel);
    const triad = getTopologyProofResult(card.card, "triad", card.anchorByTopology.triad);
    const duelEmptyNodes = duel.diagram.nodes.filter((node) => node.kind === "space" && node.occupancy === "empty").map((node) => node.id);
    const triadEmptyNodes = triad.diagram.nodes.filter((node) => node.kind === "space" && node.occupancy === "empty").map((node) => node.id);

    expect(duel.previewTargets.some((target) => duelEmptyNodes.includes(target.nodeId))).toBe(false);
    expect(triad.previewTargets.some((target) => triadEmptyNodes.includes(target.nodeId))).toBe(false);
  });

  it("explains opposing-lane semantics differently per topology", () => {
    const card = getProofCardById("mirror-pike");
    const raid = getTopologyProofResult(card.card, "raidBoss", card.anchorByTopology.raidBoss);
    const twinfront = getTopologyProofResult(card.card, "twinfront", card.anchorByTopology.twinfront);

    expect(raid.transform.find((entry) => entry.term === "opposingUnitThisLane")?.transformed).toContain("boss sector");
    expect(twinfront.transform.find((entry) => entry.term === "opposingUnitThisLane")?.transformed).toContain(
      "enemy front contesting this line"
    );
  });

  it("derives summon wording and target preview from the same topology interpretation", () => {
    const card = getProofCardById("ember-nest");
    const triad = getTopologyProofResult(card.card, "triad", card.anchorByTopology.triad);
    const raid = getTopologyProofResult(card.card, "raidBoss", card.anchorByTopology.raidBoss);

    expect(triad.renderedRules[0]).toContain("the first open space in your seat");
    expect(triad.renderedRules[0]).not.toContain("lane");
    expect(triad.transform.find((entry) => entry.term === "summon:firstEmpty")?.transformed).toContain(
      "the first open space in your seat"
    );
    expect(triad.previewTargets.filter((target) => target.emphasis === "legal")).toEqual([
      expect.objectContaining({ nodeId: "triad-self-east", reason: "the first open space in your seat" })
    ]);
    expect(raid.renderedRules[0]).toContain("the first open allied raid space");
  });
});
