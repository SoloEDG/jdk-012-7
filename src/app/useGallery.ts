import { useEffect, useRef, useState } from "react";
import { useWalker, distance, viewingPoint } from "../features/space";
import { useCatalog } from "../features/catalog";
import { useNarration } from "../features/narration";
import { useTour } from "../features/tours";
import { useCollection } from "../features/collection";
import { useStory, buildStoryRecap } from "../features/story";
import { artworkById } from "../shared/catalog";
import {
  artworkTrack,
  reviewTrack,
  storyById,
  storyNode,
} from "../shared/story";

export function useGallery() {
  const catalog = useCatalog();
  const tour = useTour();
  const collection = useCollection();
  const walker = useWalker(catalog.observe);
  const [reviewNodeId, setReviewNodeId] = useState<string | null>(null);

  const story = useStory({
    document: collection.document,
    recordFact: collection.recordFact,
    grantReward: collection.grantReward,
  });

  const narration = useNarration(
    (track) => {
      if (track.meta.kind === "story") {
        // Only a chapter of the *current* run version may advance the story.
        const advanced = story.finish(track);
        if (advanced) {
          walker.stop();
        }
        return;
      }
      // Artwork playback only advances the fixed-order tour; it can never
      // advance the branching story.
      if (track.meta.kind === "artwork" && tour.state.phase === "listening") {
        tour.next();
      }
    },
    (track, elapsed) => {
      if (track.meta.kind === "story") story.recordHeard(elapsed, track);
    },
  );

  const go = (id: string) => {
    const a = artworkById(id);
    if (a) {
      // Wandering away from the story's current artwork pauses the story
      // instead of silently dragging the visitor back or skipping a chapter.
      // Walking to the very artwork the story already points at is harmless.
      const storyArtworkId = story.node?.artworkId;
      if (story.run && !story.run.paused && storyArtworkId !== id) {
        story.pause();
      }
      setReviewNodeId(null);
      catalog.select(id);
      walker.go(viewingPoint(a.position, a.facing));
      walker.yaw.current = a.facing;
    }
  };

  // Tour navigation (unchanged)。
  useEffect(() => {
    if (tour.state.phase === "walking" && tour.target) go(tour.target);
  }, [tour.state.phase, tour.target]);
  useEffect(() => {
    if (tour.state.phase !== "walking" || !tour.target) return;
    const a = artworkById(tour.target)!;
    if (distance(walker.position, viewingPoint(a.position, a.facing)) < 0.15) {
      tour.arrive();
      narration.play(artworkTrack(a));
    }
  }, [walker.position, tour.state.phase, tour.target]);

  /**
   * The story owns the route, so navigation is derived from the current run
   * version. A walk trigger carries the version it was issued for; when a
   * choice rewinds or a restore replaces the run, the old target is dropped.
   */
  const walkedVersion = useRef(-1);
  useEffect(() => {
    const run = story.run;
    const node = story.node;
    if (!run || !node) return;
    // A paused story yields control to free browsing; it must not keep
    // steering the walker (and must not cancel a destination the visitor
    // chose after pausing).
    if (run.paused) return;
    if (reviewNodeId) return;
    if (run.status !== "walking") return;
    if (walkedVersion.current === run.version) return;
    walkedVersion.current = run.version;
    const a = artworkById(node.artworkId);
    if (!a) return;
    catalog.select(a.id);
    walker.go(viewingPoint(a.position, a.facing));
    walker.yaw.current = a.facing;
  }, [story.run?.version, story.run?.status, story.run?.paused, story.node?.id, reviewNodeId]);

  // Arrival is measured against the *current* node only.
  useEffect(() => {
    const run = story.run;
    const node = story.node;
    if (!run || !node || reviewNodeId) return;
    if (run.paused || run.status !== "walking") return;
    const a = artworkById(node.artworkId);
    if (!a) return;
    if (distance(walker.position, viewingPoint(a.position, a.facing)) < 0.15) {
      story.arrive();
    }
  }, [
    walker.position,
    story.run?.version,
    story.run?.status,
    story.run?.paused,
    story.node?.id,
    reviewNodeId,
  ]);

  /**
   * Narration is a projection of the story state, not an imperative side
   * effect. Whenever the run version changes, the chapter track id changes,
   * so the clock restarts at line one. While walking we only preview the
   * first line (never advance the clock). A paused run yields the audio to
   * whatever the visitor is doing (free browsing, artwork or review playback).
   */
  useEffect(() => {
    const run = story.run;
    const track = story.track;
    if (!run || !track || reviewNodeId || run.paused) return;
    if (run.status === "playing") {
      if (narration.track?.id !== track.id) narration.replay(track);
      return;
    }
    if (run.status === "walking") {
      if (narration.track?.id !== track.id) narration.preview(track);
      return;
    }
    // At a question or the ending the last caption stays visible; only an
    // empty player (fresh restore) is seeded with the chapter's first line.
    const meta = narration.track?.meta;
    const sameChapter =
      meta?.kind === "story" &&
      meta.storyId === run.storyId &&
      meta.nodeId === story.node?.id;
    if (!sameChapter) narration.preview(track);
  }, [
    story.track?.id,
    story.run?.version,
    story.run?.status,
    story.run?.paused,
    reviewNodeId,
  ]);

  /**
   * A paused story must not keep counting narration time in the background.
   * Only the story's own audio is stopped; an artwork or review track the
   * visitor deliberately started keeps playing.
   */
  useEffect(() => {
    const run = story.run;
    if (!run?.paused || reviewNodeId) return;
    const meta = narration.track?.meta;
    if (meta?.kind === "story" && meta.storyId === run.storyId) {
      narration.pause();
    }
  }, [
    story.run?.paused,
    story.run?.version,
    story.run?.storyId,
    reviewNodeId,
    narration.track?.id,
  ]);

  const current = useRef({ nearby: catalog.nearby, record: collection.record });
  current.current = { nearby: catalog.nearby, record: collection.record };
  useEffect(() => {
    const t = setInterval(() => {
      if (current.current.nearby)
        current.current.record(current.current.nearby, 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const startStory = (id: string) => {
    if (!storyById(id)) return;
    tour.stop();
    setReviewNodeId(null);
    walkedVersion.current = -1;
    narration.pause();
    story.start(id);
  };

  const chooseStory = (choiceId: string) => {
    setReviewNodeId(null);
    walkedVersion.current = -1;
    const next = story.choose(choiceId);
    if (next) {
      // The chosen branch owns navigation from now on; drop any earlier
      // destination so the old target cannot be reached first.
      const s = storyById(next.storyId);
      const node = s ? storyNode(s, next.path[next.cursor]) : null;
      const a = node ? artworkById(node.artworkId) : null;
      if (a) {
        catalog.select(a.id);
        walker.go(viewingPoint(a.position, a.facing));
        walker.yaw.current = a.facing;
      }
    }
  };

  const rewindStory = () => {
    setReviewNodeId(null);
    walkedVersion.current = -1;
    const next = story.rewind();
    if (next) {
      walker.stop();
      narration.pause();
      // Space must follow the displayed version: move to the chapter whose
      // question is being re-asked, without auto-advancing the story.
      const s = storyById(next.storyId);
      const node = s ? storyNode(s, next.path[next.cursor]) : null;
      const a = node ? artworkById(node.artworkId) : null;
      if (a) {
        catalog.select(a.id);
        walker.go(viewingPoint(a.position, a.facing));
        walker.yaw.current = a.facing;
      }
    }
  };

  const reviewStory = (nodeId: string) => {
    const s = story.story;
    if (!s) return;
    const node = storyNode(s, nodeId);
    if (!node) return;
    // Free review never mutates the run. Pause the active chapter so review
    // playback cannot be mistaken for current-branch progress.
    if (story.run && !story.run.paused) story.pause();
    narration.replay(reviewTrack(s, node));
    setReviewNodeId(nodeId);
    const a = artworkById(node.artworkId);
    if (a) {
      catalog.select(a.id);
      walker.go(viewingPoint(a.position, a.facing));
      walker.yaw.current = a.facing;
    }
  };

  const stopReview = () => {
    setReviewNodeId(null);
    if (narration.track?.meta.kind === "review") narration.pause();
  };

  let reviewNode = null;
  if (story.story && reviewNodeId)
    reviewNode = storyNode(story.story, reviewNodeId);

  const storyRecap = buildStoryRecap(
    story.story,
    story.run,
    collection.document,
  );

  /**
   * Which earlier chapters on the *current* route already featured this
   * artwork? This is purely contextual: the favourite itself stays one entry.
   */
  const storyRevisitNote = (() => {
    if (!story.story || !story.run || !story.node) return null;
    const route = story.run.path.slice(0, story.run.cursor + 1);
    const artworkId = story.node.artworkId;
    const hits = route.filter(
      (nodeId) => story.story?.nodes[nodeId]?.artworkId === artworkId,
    );
    if (hits.length < 2) return null;
    return `这件作品在你的故事路线中第 ${hits.length} 次出现：当前语境是「${story.node.title}」。收藏中仍只保留一件作品。`;
  })();

  return {
    catalog,
    tour,
    collection,
    walker,
    narration,
    story,
    reviewNode,
    storyRecap,
    storyRevisitNote,
    go,
    startStory,
    chooseStory,
    rewindStory,
    reviewStory,
    stopReview,
    pauseTour: () => {
      tour.pause();
      walker.stop();
      narration.pause();
    },
    stopTour: () => {
      tour.stop();
      walker.stop();
      narration.pause();
    },
    nextTour: () => {
      walker.stop();
      narration.pause();
      tour.next();
    },
    pauseStory: () => {
      setReviewNodeId(null);
      story.pause();
      walker.stop();
      narration.pause();
    },
    resumeStory: () => {
      setReviewNodeId(null);
      walkedVersion.current = -1;
      story.resume();
    },
    stopStory: () => {
      story.stop();
      setReviewNodeId(null);
      walker.stop();
      narration.pause();
    },
    startTour: (id: string) => {
      if (story.run) story.pause();
      setReviewNodeId(null);
      walker.stop();
      narration.pause();
      tour.start(id);
    },
    listenToArtwork: (id: string) => {
      setReviewNodeId(null);
      if (story.run && !story.run.paused) story.pause();
      const a = artworkById(id);
      if (a) narration.play(artworkTrack(a));
    },
  };
}
