export type Point = { x: number; z: number };
export type Artwork = {
  id: string;
  title: string;
  en: string;
  artist: string;
  year: string;
  medium: string;
  color: string;
  position: Point;
  facing: number;
  description: string;
  transcript: string[];
  duration: number;
};
export type Route = {
  id: string;
  name: string;
  subtitle: string;
  stops: string[];
};
export type Visit = { id: string; seconds: number; at: number };
export type StoryChoice = {
  id: string;
  label: string;
  note: string;
  next: string;
  zone?: string;
};
export type StoryQuestion = {
  prompt: string;
  options: StoryChoice[];
};
export type StoryNode = {
  id: string;
  artworkId: string;
  title: string;
  lead: string;
  transcript: string[];
  duration: number;
  question?: StoryQuestion;
  next?: string | null;
};
export type Story = {
  id: string;
  name: string;
  subtitle: string;
  entry: string;
  nodes: Record<string, StoryNode>;
  closedZones: Record<string, string>;
};
export type StoryRunStatus = "walking" | "playing" | "choice" | "done";
export type StoryRun = {
  schemaVersion: number;
  storyId: string;
  version: number;
  path: string[];
  cursor: number;
  decisions: Record<string, string>;
  status: StoryRunStatus;
  paused: boolean;
  notice: string | null;
};
export type StoryFact = {
  id: string;
  storyId: string;
  nodeId: string;
  artworkId: string;
  line: number;
  at: number;
};
export type StoryReward = {
  id: string;
  storyId: string;
  nodeId: string;
  kind: "chapter" | "ending";
  at: number;
};
export type GalleryDocument = {
  favorites: string[];
  visits: Visit[];
  notes: Record<string, string>;
  storyFacts: StoryFact[];
  storyRewards: StoryReward[];
};
export type StoryRecapChapter = {
  nodeId: string;
  title: string;
  artworkTitle: string;
  current: boolean;
};
export type StoryRecapFact = {
  nodeId: string;
  nodeTitle: string;
  artworkTitle: string;
  text: string;
  line: number;
  abandoned: boolean;
};
export type StoryRecapSnapshot = {
  storyId: string;
  storyName: string;
  version: number;
  status: StoryRunStatus | "paused";
  completed: boolean;
  chapters: StoryRecapChapter[];
  facts: StoryRecapFact[];
  abandonedFactCount: number;
  rewardCount: number;
  routeRewardCount: number;
};
export type TourState = {
  routeId: string | null;
  step: number;
  phase: "idle" | "walking" | "listening" | "paused" | "done";
};
export type NarrationMeta =
  | { kind: "artwork"; artworkId: string }
  | { kind: "story"; storyId: string; nodeId: string; version: number }
  | { kind: "review"; storyId: string; nodeId: string };
export type NarrationTrack = {
  id: string;
  title: string;
  transcript: string[];
  duration: number;
  meta: NarrationMeta;
};
export type AudioState = {
  track: NarrationTrack | null;
  elapsed: number;
  playing: boolean;
  rate: number;
};
export type Command =
  { type: "focus"; id: string } | { type: "favorite"; id: string };
