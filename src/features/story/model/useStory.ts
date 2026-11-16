import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GalleryDocument,
  NarrationTrack,
  Story,
  StoryFact,
  StoryRecapSnapshot,
  StoryRun,
} from "../../../shared/types";
import {
  choiceIsClosed,
  closedReason,
  currentNode as currentNodeOf,
  storyById,
  storyTrack,
} from "../../../shared/story";
import { artworkById } from "../../../shared/catalog";
import { loadStoryRun, saveStoryRun } from "../../../shared/storage";
import {
  arriveAtNode,
  chooseOption,
  dismissNotice,
  finishChapter,
  pauseAway,
  restoreRun,
  resumeStory,
  rewindToPreviousChoice,
  startRun,
} from "../lib/storyMachine";

type Journal = {
  document: GalleryDocument;
  recordFact: (fact: Omit<StoryFact, "at">, at?: number) => void;
  grantReward: (
    storyId: string,
    nodeId: string,
    kind: "chapter" | "ending",
  ) => void;
};

export function useStory(journal: Journal) {
  const [run, setRunState] = useState<StoryRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * The run ref is updated *synchronously* with every transition. Narration
   * callbacks fire from timers outside React, so comparing against the last
   * committed version (not the last rendered one) is what prevents a stale
   * end-of-chapter callback from completing a branch the visitor just left.
   */
  const runRef = useRef<StoryRun | null>(null);
  const storyRef = useRef<Story | null>(null);

  const commit = useCallback((next: StoryRun | null) => {
    runRef.current = next;
    storyRef.current = next ? storyById(next.storyId) : null;
    setRunState(next);
    saveStoryRun(next);
  }, []);

  // Restore exactly once, validating the persisted route against the story.
  const restoredOnce = useRef(false);
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    const raw = loadStoryRun();
    const candidateStory = storyById(
      raw && typeof raw === "object"
        ? ((raw as Partial<StoryRun>).storyId ?? null)
        : null,
    );
    const restored = restoreRun(raw, candidateStory);
    if (restored) commit(restored);
    else if (raw != null) saveStoryRun(null);
  }, [commit]);

  const story = useMemo(
    () => (run ? storyById(run.storyId) : null),
    [run?.storyId],
  );

  const node = useMemo(
    () => (story && run ? currentNodeOf(story, run) : null),
    [story, run],
  );

  const track = useMemo(
    () => (story && node && run ? storyTrack(story, node, run.version) : null),
    [story, node, run?.version],
  );

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const start = useCallback(
    (storyId: string) => {
      const s = storyById(storyId);
      if (!s) return;
      setError(null);
      commit(startRun(s));
    },
    [commit],
  );

  const arrive = useCallback(() => {
    const current = runRef.current;
    const s = storyRef.current;
    if (!current || !s) return;
    const next = arriveAtNode(s, current);
    if (next !== current) commit(next);
  }, [commit]);

  // A chapter that is fully heard records all of its lines, including the
  // last one whose threshold coincides with the track's duration.
  const commitFacts = useCallback(
    (s: Story, nodeId: string) => {
      const chapter = s.nodes[nodeId];
      if (!chapter) return;
      chapter.transcript.forEach((_, line) =>
        journal.recordFact({
          id: `story:${s.id}:${chapter.id}:${line}`,
          storyId: s.id,
          nodeId: chapter.id,
          artworkId: chapter.artworkId,
          line,
        }),
      );
    },
    [journal],
  );

  /**
   * Only the narration bound to the *current* run version may advance the
   * story. A late callback from a branch that was just abandoned is ignored,
   * so a chapter cannot be completed twice or skip a passage.
   */
  const finish = useCallback(
    (narration: NarrationTrack): boolean => {
      const current = runRef.current;
      const s = storyRef.current;
      if (!current || !s || narration.meta.kind !== "story") return false;
      const meta = narration.meta;
      if (
        meta.storyId !== s.id ||
        meta.version !== current.version ||
        current.status !== "playing" ||
        current.paused
      ) {
        return false;
      }
      const chapter = currentNodeOf(s, current);
      if (!chapter || chapter.id !== meta.nodeId) return false;
      const next = finishChapter(s, current, meta.version);
      if (next === current) return false;
      commitFacts(s, chapter.id);
      journal.grantReward(
        s.id,
        chapter.id,
        chapter.next || chapter.question ? "chapter" : "ending",
      );
      setError(null);
      commit(next);
      return true;
    },
    [journal, commitFacts, commit],
  );

  const choose = useCallback(
    (choiceId: string): StoryRun | null => {
      const current = runRef.current;
      const s = storyRef.current;
      if (!current || !s) return null;
      const result = chooseOption(s, current, choiceId);
      if (result.error) {
        setError(result.error);
        return null;
      }
      setError(null);
      commit(result.run);
      return result.run;
    },
    [commit],
  );

  const rewind = useCallback((): StoryRun | null => {
    const current = runRef.current;
    const s = storyRef.current;
    if (!current || !s) return null;
    const result = rewindToPreviousChoice(s, current);
    if (result.error) {
      setError(result.error);
      return null;
    }
    setError(null);
    commit(result.run);
    return result.run;
  }, [commit]);

  const pause = useCallback(() => {
    const current = runRef.current;
    if (!current) return;
    const next = pauseAway(current);
    if (next !== current) commit(next);
  }, [commit]);

  const resume = useCallback(() => {
    const current = runRef.current;
    if (!current) return;
    const next = resumeStory(current);
    if (next !== current) commit(next);
  }, [commit]);

  const stop = useCallback(() => {
    setError(null);
    commit(null);
  }, [commit]);

  const clearNotice = useCallback(() => {
    const current = runRef.current;
    if (!current) return;
    const next = dismissNotice(current);
    if (next !== current) commit(next);
  }, [commit]);

  /**
   * Record narrative lines that have fully played. Facts are keyed by
   * story/node/line, so rewalking a branch, rewinding, or restoring after a
   * refresh cannot duplicate them.
   */
  const recordHeard = useCallback(
    (elapsed: number, narration: NarrationTrack) => {
      const current = runRef.current;
      const s = storyRef.current;
      if (!current || !s || narration.meta.kind !== "story") return;
      const meta = narration.meta;
      if (meta.storyId !== s.id || meta.version !== current.version) return;
      if (current.paused || current.status !== "playing") return;
      const chapter = currentNodeOf(s, current);
      if (!chapter || chapter.id !== meta.nodeId) return;
      const width = chapter.duration / chapter.transcript.length;
      chapter.transcript.forEach((_, line) => {
        if (elapsed + 1e-6 < width * (line + 1)) return;
        journal.recordFact({
          id: `story:${s.id}:${chapter.id}:${line}`,
          storyId: s.id,
          nodeId: chapter.id,
          artworkId: chapter.artworkId,
          line,
        });
      });
    },
    [journal],
  );

  const choices = useMemo(() => {
    if (!story || !node?.question) return [];
    return node.question.options.map((choice) => ({
      ...choice,
      closed: choiceIsClosed(story, choice),
      closedNote: closedReason(story, choice),
    }));
  }, [story, node]);

  return {
    run,
    story,
    node,
    track,
    error,
    choices,
    start,
    arrive,
    finish,
    choose,
    rewind,
    pause,
    resume,
    stop,
    clearNotice,
    recordHeard,
    dismissError: () => setError(null),
  };
}

export function buildStoryRecap(
  story: Story | null,
  run: StoryRun | null,
  document: GalleryDocument,
): StoryRecapSnapshot | null {
  if (!story || !run) return null;
  const routeIds = new Set(run.path);
  const chapters = run.path.map((nodeId) => {
    const n = story.nodes[nodeId];
    return {
      nodeId,
      title: n?.title || nodeId,
      artworkTitle: n ? artworkById(n.artworkId)?.title || "" : "",
      current: nodeId === run.path[run.cursor],
    };
  });
  const facts = document.storyFacts
    .filter((f) => f.storyId === story.id)
    .sort((a, b) => a.at - b.at)
    .map((f) => {
      const n = story.nodes[f.nodeId];
      return {
        nodeId: f.nodeId,
        nodeTitle: n?.title || f.nodeId,
        artworkTitle: n ? artworkById(n.artworkId)?.title || "" : "",
        text: n?.transcript[f.line] || "",
        line: f.line,
        abandoned: !routeIds.has(f.nodeId),
      };
    });
  const rewards = document.storyRewards.filter((r) => r.storyId === story.id);
  return {
    storyId: story.id,
    storyName: story.name,
    version: run.version,
    status: run.paused ? "paused" : run.status,
    completed: run.status === "done" && !run.paused,
    chapters,
    facts,
    abandonedFactCount: facts.filter((f) => f.abandoned).length,
    rewardCount: rewards.length,
    routeRewardCount: rewards.filter((r) => routeIds.has(r.nodeId)).length,
  };
}
