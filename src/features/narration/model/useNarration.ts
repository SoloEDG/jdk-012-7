import { useEffect, useRef, useState } from "react";
import type { AudioState, NarrationTrack } from "../../../shared/types";
import { captionAt } from "../lib/timeline";
import { speak, stopSpeech } from "../lib/speech";

/**
 * A single narration clock for artworks, story chapters and review playback.
 * Track ids embed the identity that matters (artwork, story chapter + story
 * version, review target), so a replaced track can never inherit progress or
 * a completion callback from the track it replaced.
 */
export function useNarration(
  onEnd: (track: NarrationTrack) => void,
  onProgress?: (track: NarrationTrack, elapsed: number) => void,
) {
  const [state, setState] = useState<AudioState>({
    track: null,
    elapsed: 0,
    playing: false,
    rate: 1,
  });
  const endCallback = useRef(onEnd);
  endCallback.current = onEnd;
  const progressCallback = useRef(onProgress);
  progressCallback.current = onProgress;
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!state.playing || !state.track) return;
    const track = state.track;
    let previous = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      const delta = (now - previous) / 1000;
      previous = now;
      setState((s) => {
        if (!s.track || s.track.id !== track.id) return s;
        return { ...s, elapsed: s.elapsed + delta * s.rate };
      });
    }, 150);
    return () => clearInterval(t);
  }, [state.playing, state.track?.id]);

  /**
   * Progress is reported from an effect rather than from inside the state
   * updater: updaters must stay pure, and a fact journal must never be
   * written twice because React replayed an update.
   */
  useEffect(() => {
    if (state.playing && state.track) {
      progressCallback.current?.(state.track, state.elapsed);
    }
  }, [state.elapsed, state.playing, state.track]);

  const track = state.track;
  const caption = track ? captionAt(track, state.elapsed) : "";
  useEffect(() => {
    if (state.playing && caption) setSupported(speak(caption, state.rate));
    else stopSpeech();
    return stopSpeech;
  }, [caption, state.playing, state.rate]);

  useEffect(() => {
    if (track && state.playing && state.elapsed >= track.duration) {
      setState((s) =>
        s.track?.id === track.id
          ? { ...s, playing: false, elapsed: track.duration }
          : s,
      );
      endCallback.current(track);
    }
  }, [state.elapsed, state.playing, track]);

  const load = (next: NarrationTrack, restart: boolean) => {
    setState((s) => ({
      ...s,
      track: next,
      elapsed: restart || s.track?.id !== next.id ? 0 : s.elapsed,
      playing: true,
    }));
  };

  /**
   * `play` is idempotent for the *same* track: pressing play on a chapter
   * that is already playing must not rewind it, and pressing play on the
   * current chapter after pausing resumes instead of replaying.
   */
  const play = (next: NarrationTrack) => load(next, false);
  /** Start a track from its first line, e.g. after rewinding a choice. */
  const replay = (next: NarrationTrack) => load(next, true);
  /** Show a track's first caption without starting the clock. */
  const preview = (next: NarrationTrack) =>
    setState((s) => ({ ...s, track: next, elapsed: 0, playing: false }));

  return {
    state,
    track,
    caption,
    supported,
    play,
    replay,
    preview,
    pause: () => setState((s) => (s.playing ? { ...s, playing: false } : s)),
    resume: () => setState((s) => (s.track ? { ...s, playing: true } : s)),
    /** Pressing play on a finished track restarts it from the first line. */
    toggle: () =>
      setState((s) =>
        s.track
          ? s.playing
            ? { ...s, playing: false }
            : {
                ...s,
                elapsed: s.elapsed >= s.track.duration ? 0 : s.elapsed,
                playing: true,
              }
          : s,
      ),
    seek: (elapsed: number) => setState((s) => ({ ...s, elapsed })),
    rate: (rate: number) => setState((s) => ({ ...s, rate })),
  };
}
