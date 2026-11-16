import type {
  GalleryDocument,
  StoryFact,
  StoryReward,
} from "../../../shared/types";

/**
 * Document-level journals are append-only and idempotent. Facts are keyed by
 * story/node/line and rewards by story/node/kind, so replaying a chapter,
 * rewinding a choice, or restoring after a refresh never duplicates a record
 * and never re-grants a reward for a chapter that was already completed.
 */
export function addFact(
  d: GalleryDocument,
  fact: Omit<StoryFact, "at">,
  at = Date.now(),
): GalleryDocument {
  // Derive the key from content instead of trusting the caller, so the same
  // heard line can never enter the journal twice under different ids.
  const id = `story:${fact.storyId}:${fact.nodeId}:${fact.line}`;
  if (d.storyFacts.some((f) => f.id === id)) return d;
  return { ...d, storyFacts: [...d.storyFacts, { ...fact, id, at }] };
}

export function addReward(
  d: GalleryDocument,
  storyId: string,
  nodeId: string,
  kind: StoryReward["kind"],
  at = Date.now(),
): GalleryDocument {
  const id = `story:${storyId}:${nodeId}:${kind}`;
  if (d.storyRewards.some((r) => r.id === id)) return d;
  return {
    ...d,
    storyRewards: [...d.storyRewards, { id, storyId, nodeId, kind, at }],
  };
}

export function hasFact(
  d: GalleryDocument,
  storyId: string,
  nodeId: string,
  line: number,
): boolean {
  return d.storyFacts.some(
    (f) =>
      f.storyId === storyId && f.nodeId === nodeId && f.line === line,
  );
}

export function rewardFor(
  d: GalleryDocument,
  storyId: string,
  nodeId: string,
  kind: StoryReward["kind"],
): StoryReward | undefined {
  return d.storyRewards.find(
    (r) => r.storyId === storyId && r.nodeId === nodeId && r.kind === kind,
  );
}
