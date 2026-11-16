import type { GalleryDocument, StoryReward, StoryRun } from "./types";
const key = "yujing-gallery-v1";
const storyKey = "yujing-story-run-v1";

export const emptyDocument = (): GalleryDocument => ({
  favorites: [],
  visits: [],
  notes: {},
  storyFacts: [],
  storyRewards: [],
});

function validReward(v: unknown): v is StoryReward {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<StoryReward>;
  return (
    typeof r.id === "string" &&
    typeof r.storyId === "string" &&
    typeof r.nodeId === "string" &&
    (r.kind === "chapter" || r.kind === "ending") &&
    typeof r.at === "number"
  );
}

export function loadDocument(): GalleryDocument {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    if (!d) return emptyDocument();
    return {
      favorites: Array.isArray(d.favorites)
        ? d.favorites.filter((v: unknown) => typeof v === "string")
        : [],
      visits: Array.isArray(d.visits)
        ? d.visits.filter(
            (v: { id?: unknown; seconds?: unknown }) =>
              typeof v.id === "string" && typeof v.seconds === "number",
          )
        : [],
      notes: typeof d.notes === "object" && d.notes ? d.notes : {},
      storyFacts: Array.isArray(d.storyFacts)
        ? d.storyFacts.filter(
            (v: {
              id?: unknown;
              storyId?: unknown;
              nodeId?: unknown;
              artworkId?: unknown;
              line?: unknown;
              at?: unknown;
            }) =>
              typeof v.id === "string" &&
              typeof v.storyId === "string" &&
              typeof v.nodeId === "string" &&
              typeof v.artworkId === "string" &&
              typeof v.line === "number" &&
              typeof v.at === "number",
          )
        : [],
      storyRewards: Array.isArray(d.storyRewards)
        ? d.storyRewards.filter(validReward)
        : [],
    };
  } catch {
    return emptyDocument();
  }
}
export function saveDocument(d: GalleryDocument): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function loadStoryRun(): unknown {
  try {
    return JSON.parse(localStorage.getItem(storyKey) || "null");
  } catch {
    return null;
  }
}

export function saveStoryRun(run: StoryRun | null): boolean {
  try {
    if (run) localStorage.setItem(storyKey, JSON.stringify(run));
    else localStorage.removeItem(storyKey);
    return true;
  } catch {
    return false;
  }
}
