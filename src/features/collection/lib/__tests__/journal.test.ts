import { describe, expect, it } from "vitest";
import type { GalleryDocument } from "../../../../shared/types";
import { addFact, addReward, hasFact, rewardFor } from "../journal";

const empty = (): GalleryDocument => ({
  favorites: [],
  visits: [],
  notes: {},
  storyFacts: [],
  storyRewards: [],
});

const fact = {
  id: "story:echo-path:n-tide:0",
  storyId: "echo-path",
  nodeId: "n-tide",
  artworkId: "a2",
  line: 0,
};

describe("journal", () => {
  it("records a fact once no matter how often it is heard again", () => {
    let d = empty();
    d = addFact(d, fact, 10);
    d = addFact(d, fact, 20);
    d = addFact(d, { ...fact, line: 1 }, 30);
    expect(d.storyFacts).toHaveLength(2);
    expect(d.storyFacts.filter((f) => f.line === 0)[0].at).toBe(10);
    expect(hasFact(d, "echo-path", "n-tide", 0)).toBe(true);
  });

  it("does not mutate the previous document", () => {
    const before = empty();
    const after = addFact(before, fact);
    expect(before.storyFacts).toHaveLength(0);
    expect(after).not.toBe(before);
  });

  it("grants a chapter reward at most once", () => {
    let d = empty();
    d = addReward(d, "echo-path", "n-tide", "chapter", 100);
    d = addReward(d, "echo-path", "n-tide", "chapter", 200);
    expect(d.storyRewards).toHaveLength(1);
    expect(rewardFor(d, "echo-path", "n-tide", "chapter")?.at).toBe(100);
  });

  it("keeps chapter and ending rewards separate", () => {
    let d = empty();
    d = addReward(d, "echo-path", "n-vessel", "ending");
    d = addReward(d, "echo-path", "n-vessel", "chapter");
    expect(d.storyRewards).toHaveLength(2);
  });
});
