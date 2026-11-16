// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../App";
import { STORY_SCHEMA_VERSION } from "../../features/story";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null,
});

const DOC_KEY = "yujing-gallery-v1";
const RUN_KEY = "yujing-story-run-v1";

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function readRun() {
  return JSON.parse(localStorage.getItem(RUN_KEY) || "null");
}
function readDoc() {
  return JSON.parse(localStorage.getItem(DOC_KEY) || "null");
}
function panel() {
  return within(screen.getByTestId("story-panel"));
}
function mapCenter() {
  const el = document.querySelector('[data-testid="map-position"]');
  return { x: Number(el?.getAttribute("cx")), z: Number(el?.getAttribute("cy")) };
}

function startStory() {
  fireEvent.click(screen.getByText("开启分支故事"));
  advance(20);
}

/** Drive the walker to the entry artwork, then let the chapter finish. */
function finishCurrentChapter() {
  // walking is capped at 2.5 u/s; 40s is always enough for this gallery.
  advance(40_000);
  const range = screen.getByLabelText("讲解进度") as HTMLInputElement;
  const max = Number(range.max);
  act(() => {
    fireEvent.change(range, { target: { value: String(max) } });
  });
  advance(400);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("branching story flow", () => {
  it("locks choices until the narration ends and refuses closed branches", () => {
    render(<App />);
    startStory();
    // The question is not rendered before the chapter has been heard.
    expect(screen.queryByText("沿潮痕向内陆走")).toBeNull();
    finishCurrentChapter();
    expect(screen.getByText("沿潮痕向内陆走")).toBeTruthy();
    const closed = screen.getByText("穿过西侧长廊").closest("button")!;
    expect(closed.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    expect(readRun().path).toEqual(["n-tide", "n-mountain"]);
    // Space follows the new version: the map marker moves toward the mountain.
    const mountain = mapCenter();
    advance(20_000);
    const atMountain = mapCenter();
    expect(atMountain).not.toEqual(mountain);
    expect(screen.getByTestId("scene-mode").textContent).toContain("回声之径");
  });

  it("keeps one favourite while the same artwork is revisited in a new context", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    // Choose the loop that returns to the tide chapter via the mountain.
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    finishCurrentChapter();
    fireEvent.click(screen.getByText("回到潮水退去处，再听一次"));
    advance(20);
    finishCurrentChapter();
    const run = readRun();
    expect(run.path.slice(0, 3)).toEqual([
      "n-tide",
      "n-mountain",
      "n-tide-again",
    ]);
    // Same artwork twice on the route, in two different narrative contexts.
    expect(panel().getByText("回声路线 · 潮汐的第二次回返")).toBeTruthy();
    // Favourite it once through the detail panel.
    fireEvent.click(screen.getByRole("button", { name: "探索展馆" }));
    advance(20);
    fireEvent.click(screen.getByRole("button", { name: "收藏作品" }));
    advance(20);
    expect(readDoc().favorites).toEqual(["a2"]);
    // The revisit note explains the second occurrence without adding an entry.
    expect(screen.getByText(/第 2 次出现/)).toBeTruthy();
    expect(readDoc().favorites.filter((id: string) => id === "a2")).toHaveLength(1);
  });

  it("rewind keeps heard facts but resets the current-route completion", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    finishCurrentChapter();
    const before = readDoc();
    expect(before.storyRewards.length).toBe(2);
    expect(before.storyFacts.length).toBe(6);
    fireEvent.click(panel().getByText("重做上个选择"));
    advance(20);
    const run = readRun();
    expect(run.path).toEqual(["n-tide"]);
    expect(run.status).toBe("choice");
    const after = readDoc();
    expect(after.storyFacts.length).toBe(before.storyFacts.length);
    expect(after.storyRewards.length).toBe(before.storyRewards.length);
    expect(screen.getByText(/已返回/)).toBeTruthy();
  });

  it("restores the persisted version on refresh without skipping the chapter", () => {
    const first = render(<App />);
    startStory();
    finishCurrentChapter();
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    const saved = readRun();
    first.unmount();
    cleanup();

    const second = render(<App />);
    advance(20);
    const restored = readRun();
    expect(restored.storyId).toBe(saved.storyId);
    expect(restored.path).toEqual(saved.path);
    expect(restored.status).toBe("walking");
    expect(restored.notice).toContain("重新讲解");
    // The restored chapter restarts from line one instead of resuming.
    const range = screen.getByLabelText("讲解进度") as HTMLInputElement;
    expect(Number(range.value)).toBe(0);
    // No reward or fact is granted merely by restoring.
    const doc = readDoc();
    expect(doc.storyRewards.length).toBe(1);
    expect(doc.storyFacts.length).toBe(3);
    expect(screen.getByTestId("story-dock").textContent).toContain("故事版本");
  });

  it("does not double-grant a reward when a late end callback arrives after rewind", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    advance(40_000);
    const range = screen.getByLabelText("讲解进度") as HTMLInputElement;
    act(() => {
      fireEvent.change(range, { target: { value: String(Number(range.max) - 0.2) } });
    });
    // Rewind while the chapter is a fraction of a second from ending.
    fireEvent.click(panel().getByText("重做上个选择"));
    advance(2_000);
    const doc = readDoc();
    expect(doc.storyRewards).toHaveLength(1);
    expect(readRun().path).toEqual(["n-tide"]);
    expect(readRun().status).toBe("choice");
  });
});

describe("version consistency", () => {
  it("rewinding while walking returns to the question chapter on the same version", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    // Still en route: the panel is walking, then we redo the choice.
    expect(panel().getByText(/前往作品前/)).toBeTruthy();
    fireEvent.click(panel().getByText("重做上个选择"));
    advance(20);
    const run = readRun();
    expect(run.path).toEqual(["n-tide"]);
    expect(run.status).toBe("choice");
    expect(panel().getByText("沿潮痕向内陆走")).toBeTruthy();
    expect(panel().getByText(/故事版本 v\d+/).textContent).toBe(
      `故事版本 v${run.version}`,
    );
    expect(screen.getByTestId("story-dock").textContent).toContain(
      `v${run.version}`,
    );
    // Heading back to the tide artwork (a2 sits on the centre line),
    // never toward the abandoned mountain stop on the left wall.
    advance(60_000);
    const position = mapCenter();
    expect(position.x).toBeCloseTo(80, 0);
  });

  it("changing a choice twice in a row never grants a duplicate reward", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    fireEvent.click(screen.getByText("沿潮痕向内陆走"));
    advance(20);
    fireEvent.click(panel().getByText("重做上个选择"));
    advance(20);
    fireEvent.click(screen.getByText("追随水面的返照"));
    advance(20);
    expect(readRun().path).toEqual(["n-tide", "n-light"]);
    const doc = readDoc();
    expect(doc.storyRewards.filter((r: any) => r.nodeId === "n-tide")).toHaveLength(
      1,
    );
    // Restoring can re-walk the chapter, but still never duplicates rewards.
    cleanup();
    render(<App />);
    advance(20);
    expect(
      readDoc().storyRewards.filter((r: any) => r.nodeId === "n-tide"),
    ).toHaveLength(1);
  });

  it("keeps a closed branch visible but disabled with its reason", () => {
    render(<App />);
    startStory();
    finishCurrentChapter();
    const closed = screen.getByText("穿过西侧长廊").closest("button")!;
    expect(closed.hasAttribute("disabled")).toBe(true);
    expect(closed.textContent).toContain("封闭");
    // Choosing another branch works and leaves the closed branch unexplored.
    fireEvent.click(screen.getByText("追随水面的返照"));
    advance(20);
    expect(readRun().path).toEqual(["n-tide", "n-light"]);
  });

  it("records facts progressively but never twice for the same line", () => {
    render(<App />);
    startStory();
    // Walk to the artwork (and no further) so the chapter is actually playing.
    advance(6_000);
    const range = screen.getByLabelText("讲解进度") as HTMLInputElement;
    const max = Number(range.max);
    act(() => {
      fireEvent.change(range, { target: { value: String(max / 2) } });
    });
    advance(400);
    const partial = readDoc().storyFacts.length;
    expect(partial).toBeGreaterThanOrEqual(1);
    act(() => {
      fireEvent.change(range, { target: { value: String(max - 0.1) } });
    });
    advance(2_000);
    const full = readDoc().storyFacts;
    expect(full.length).toBe(3);
    expect(new Set(full.map((f: any) => f.id)).size).toBe(full.length);
  });
});
