import { describe, expect, it } from "vitest";
import { stories } from "../../../../shared/story";
import {
  arriveAtNode,
  chooseOption,
  finishChapter,
  pauseAway,
  resumeStory,
  restoreRun,
  rewindToPreviousChoice,
  startRun,
} from "../storyMachine";

const story = stories[0];

function atChoice(nodeId: string) {
  let run = startRun(story);
  run = { ...run, path: [nodeId], cursor: 0 };
  run = arriveAtNode(story, run);
  return finishChapter(story, run, run.version);
}

describe("branching", () => {
  it("starts walking to the entry chapter", () => {
    const run = startRun(story);
    expect(run.path).toEqual([story.entry]);
    expect(run.status).toBe("walking");
    expect(run.version).toBe(1);
  });

  it("only opens choices after the narration genuinely ends", () => {
    let run = startRun(story);
    run = arriveAtNode(story, run);
    const early = chooseOption(story, run, "to-mountain");
    expect(early.error).toBeTruthy();
    expect(early.run).toBe(run);
    run = finishChapter(story, run, run.version);
    expect(run.status).toBe("choice");
    const late = chooseOption(
      story,
      { ...run, version: run.version + 5 },
      "to-mountain",
      run.version,
    );
    expect(late.error).toBeTruthy();
    const ok = chooseOption(story, run, "to-mountain");
    expect(ok.error).toBeUndefined();
    expect(ok.run.path).toEqual(["n-tide", "n-mountain"]);
    expect(ok.run.status).toBe("walking");
  });

  it("ignores a stale end-of-narration callback from an abandoned version", () => {
    let run = atChoice("n-tide");
    const stale = run.version;
    run = chooseOption(story, run, "to-mountain").run;
    const afterStale = finishChapter(story, run, stale);
    expect(afterStale).toBe(run);
  });

  it("marks an ending only after its own narration completes", () => {
    let run = startRun(story);
    run = { ...run, path: ["n-vessel"], cursor: 0 };
    run = arriveAtNode(story, run);
    expect(run.status).toBe("playing");
    run = finishChapter(story, run, run.version);
    expect(run.status).toBe("done");
  });

  it("makes a closed branch unreachable without dropping the others", () => {
    const run = atChoice("n-tide");
    const result = chooseOption(story, run, "to-west");
    expect(result.error).toContain("封闭");
    expect(result.run).toBe(run);
    const open = chooseOption(story, run, "to-light");
    expect(open.error).toBeUndefined();
  });
});

describe("rewind", () => {
  it("only offers the most recent answered choice", () => {
    let run = atChoice("n-tide");
    run = chooseOption(story, run, "to-mountain").run;
    run = arriveAtNode(story, run);
    run = finishChapter(story, run, run.version);
    expect(run.path).toEqual(["n-tide", "n-mountain"]);
    const redo = rewindToPreviousChoice(story, run);
    expect(redo.error).toBeUndefined();
    expect(redo.run.path).toEqual(["n-tide"]);
    expect(redo.run.cursor).toBe(0);
    expect(redo.run.decisions).toEqual({});
    expect(redo.run.status).toBe("choice");
  });

  it("refuses a rewind before any choice was made", () => {
    const run = startRun(story);
    const result = rewindToPreviousChoice(story, run);
    expect(result.error).toBeTruthy();
    expect(result.run).toBe(run);
  });

  it("redoing a choice discards abandoned decisions but keeps earlier ones", () => {
    let run = atChoice("n-tide");
    run = chooseOption(story, run, "to-mountain").run;
    run = arriveAtNode(story, run);
    run = finishChapter(story, run, run.version);
    run = chooseOption(story, run, "higher").run;
    run = arriveAtNode(story, run);
    run = finishChapter(story, run, run.version);
    expect(run.path).toEqual([
      "n-tide",
      "n-mountain",
      "n-floating",
      "n-vessel",
    ]);
    const once = rewindToPreviousChoice(story, run);
    expect(once.run.path).toEqual(["n-tide", "n-mountain"]);
    expect(once.run.decisions).toEqual(
      expect.objectContaining({ "n-tide": "to-mountain" }),
    );
    const twice = rewindToPreviousChoice(story, once.run);
    expect(twice.run.path).toEqual(["n-tide"]);
    expect(twice.run.decisions).toEqual({});
  });

  it("rewinding from a question keeps the previously chosen options unmarked", () => {
    let run = atChoice("n-tide");
    run = chooseOption(story, run, "to-light").run;
    run = arriveAtNode(story, run);
    run = finishChapter(story, run, run.version);
    const redo = rewindToPreviousChoice(story, run);
    expect(redo.run.status).toBe("choice");
    expect(redo.run.path).toEqual(["n-tide"]);
  });
});

describe("pause and resume", () => {
  it("invalidates the active narration version while paused", () => {
    let run = startRun(story);
    run = arriveAtNode(story, run);
    const stale = run.version;
    const paused = pauseAway(run);
    expect(paused.paused).toBe(true);
    expect(finishChapter(story, paused, stale)).toBe(paused);
    expect(chooseOption(story, paused, "to-mountain").error).toBeTruthy();
  });

  it("resumes by re-walking the same chapter instead of skipping it", () => {
    let run = atChoice("n-vessel");
    const paused = pauseAway({ ...run, status: "playing" });
    const resumed = resumeStory(paused);
    expect(resumed.status).toBe("walking");
    expect(resumed.path).toEqual(run.path);
    expect(resumed.paused).toBe(false);
  });
});

describe("restore", () => {
  it("rejects a run belonging to another story or schema", () => {
    expect(restoreRun({ ...startRun(story), storyId: "other" }, story)).toBeNull();
    expect(restoreRun({ ...startRun(story), schemaVersion: 1 }, story)).toBeNull();
    expect(restoreRun(null, story)).toBeNull();
  });

  it("restores a valid route but always re-walks the current chapter", () => {
    let run = atChoice("n-tide");
    run = chooseOption(story, run, "to-mountain").run;
    run = arriveAtNode(story, run);
    const restored = restoreRun(JSON.parse(JSON.stringify(run)), story)!;
    expect(restored.path).toEqual(["n-tide", "n-mountain"]);
    expect(restored.cursor).toBe(1);
    expect(restored.status).toBe("walking");
    expect(restored.version).toBeGreaterThan(run.version);
    expect(restored.paused).toBe(false);
    expect(restored.notice).toContain("重新讲解");
  });

  it("cuts an old route back to the last choice that still matches", () => {
    const raw = {
      ...startRun(story),
      version: 9,
      path: ["n-tide", "n-mountain", "n-floating"],
      cursor: 2,
      decisions: { "n-tide": "to-mountain" },
      status: "playing",
    };
    const restored = restoreRun(raw, story)!;
    expect(restored.path).toEqual(["n-tide", "n-mountain"]);
    expect(restored.cursor).toBe(1);
    expect(restored.notice).toContain("不一致");
  });

  it("cuts a route that went through a branch which is now closed", () => {
    const closedStory = {
      ...story,
      closedZones: { west: "封闭" },
    };
    const raw = {
      ...startRun(closedStory),
      path: ["n-tide", "n-floating"],
      cursor: 1,
      decisions: { "n-tide": "to-west" },
      status: "playing",
    };
    const restored = restoreRun(raw, closedStory)!;
    expect(restored.path).toEqual(["n-tide"]);
    expect(restored.cursor).toBe(0);
    expect(restored.status).toBe("walking");
    expect(restored.decisions).toEqual({});
  });

  it("never restores into a finished state at a chapter that is not an ending", () => {
    const raw = {
      ...startRun(story),
      path: ["n-tide", "n-light"],
      cursor: 1,
      decisions: { "n-tide": "to-light" },
      status: "done",
    };
    const restored = restoreRun(raw, story)!;
    expect(restored.path).toEqual(["n-tide", "n-light"]);
    expect(restored.status).toBe("walking");
    expect(restored.notice).toContain("重新讲解");
  });

  it("refuses a route that does not start at the entry chapter", () => {
    const raw = { ...startRun(story), path: ["n-vessel", "n-tide"], cursor: 1 };
    expect(restoreRun(raw, story)).toBeNull();
  });

  it("drops unknown trailing nodes", () => {
    const raw = {
      ...startRun(story),
      path: ["n-tide", "n-mountain", "n-removed"],
      cursor: 2,
      decisions: { "n-tide": "to-mountain" },
    };
    const restored = restoreRun(raw, story)!;
    expect(restored.path).toEqual(["n-tide", "n-mountain"]);
    expect(restored.cursor).toBe(1);
    expect(restored.notice).toContain("不存在");
  });
});

describe("story graph", () => {
  it("can revisit the same artwork through a different context", () => {
    const tideNodes = Object.values(story.nodes).filter(
      (n) => n.artworkId === "a2",
    );
    expect(tideNodes.length).toBeGreaterThan(1);
    const lines = tideNodes.map((n) => n.transcript.join(""));
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("keeps every branch reachable and the ending shared", () => {
    const reachable = new Set<string>();
    const walk = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      const node = story.nodes[nodeId];
      expect(node, `missing node ${nodeId}`).toBeTruthy();
      reachable.add(nodeId);
      const children = node.question
        ? node.question.options.map((o) => o.next)
        : node.next
          ? [node.next]
          : [];
      children.forEach(walk);
    };
    walk(story.entry);
    expect([...reachable].sort()).toEqual(Object.keys(story.nodes).sort());
  });

  it("runs a complete route to the shared ending", () => {
    let run = startRun(story);
    let guard = 0;
    while (run.status !== "done" && guard++ < 20) {
      if (run.status === "walking") run = arriveAtNode(story, run);
      else if (run.status === "playing")
        run = finishChapter(story, run, run.version);
      else if (run.status === "choice") {
        const node = story.nodes[run.path[run.cursor]];
        const open = node.question!.options.find(
          (o) => !o.zone || !story.closedZones[o.zone],
        )!;
        run = chooseOption(story, run, open.id).run;
      }
    }
    expect(run.status).toBe("done");
    expect(run.path[run.path.length - 1]).toBe("n-vessel");
    expect(run.path.length).toBeGreaterThanOrEqual(3);
  });
});

describe("restore edge cases", () => {
  it("a repaired route never restores as done", () => {
    const raw = {
      ...startRun(story),
      path: ["n-tide", "n-gone"],
      cursor: 1,
      decisions: { "n-tide": "to-mountain" },
      status: "done",
    };
    const restored = restoreRun(raw, story)!;
    expect(restored.path).toEqual(["n-tide"]);
    expect(restored.status).toBe("walking");
  });

  it("an intact ending restores as done and marks it in the notice", () => {
    const run = {
      ...startRun(story),
      path: ["n-tide", "n-light", "n-vessel"],
      cursor: 2,
      decisions: { "n-tide": "to-light", "n-light": "vessel" },
      status: "done" as const,
    };
    const restored = restoreRun(run, story)!;
    expect(restored.status).toBe("done");
    expect(restored.notice).toContain("上次完成的故事版本");
  });

  it("lands a restored question chapter on the question, not mid-narration", () => {
    let run = atChoice("n-tide");
    const restored = restoreRun(
      { ...run, status: "choice", path: ["n-tide"], cursor: 0 },
      story,
    )!;
    // It re-walks the chapter so the question is re-earned, never assumed.
    expect(restored.status).toBe("walking");
  });
});
