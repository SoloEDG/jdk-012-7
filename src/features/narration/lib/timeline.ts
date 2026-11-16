import type { NarrationTrack } from "../../../shared/types";
export function captionAt(
  track: Pick<NarrationTrack, "transcript" | "duration">,
  elapsed: number,
): string {
  const count = track.transcript.length;
  if (!count) return "";
  return track.transcript[
    Math.min(count - 1, Math.floor((elapsed / track.duration) * count))
  ];
}
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
