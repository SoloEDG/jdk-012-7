import type { Story, StoryRun } from "../../../shared/types";
import {
  choiceIsClosed,
  closedReason,
  currentNode as currentNodeOf,
  storyNode as storyNodeById,
} from "../../../shared/story";

export const STORY_SCHEMA_VERSION = 2;

export function startRun(story: Story): StoryRun {
  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    storyId: story.id,
    version: 1,
    path: [story.entry],
    cursor: 0,
    decisions: {},
    status: "walking",
    paused: false,
    notice: null,
  };
}

/**
 * Arriving at the chapter's artwork is the only way into playback.
 * It is a no-op unless we are actually walking there and not paused.
 */
export function arriveAtNode(story: Story, run: StoryRun): StoryRun {
  if (run.status !== "walking" || run.paused) return run;
  if (!currentNodeOf(story, run)) return run;
  return { ...run, version: run.version + 1, status: "playing" };
}

/**
 * Called when the chapter's narration has genuinely played to its end.
 * `expectedVersion` makes late callbacks from an abandoned branch harmless.
 */
export function finishChapter(
  story: Story,
  run: StoryRun,
  expectedVersion: number,
): StoryRun {
  if (run.version !== expectedVersion) return run;
  if (run.status !== "playing" || run.paused) return run;
  const node = currentNodeOf(story, run);
  if (!node) return run;
  if (node.question) {
    return { ...run, version: run.version + 1, status: "choice" };
  }
  if (node.next) {
    return {
      ...run,
      version: run.version + 1,
      path: [...run.path.slice(0, run.cursor + 1), node.next],
      cursor: run.cursor + 1,
      status: "walking",
    };
  }
  return { ...run, version: run.version + 1, status: "done" };
}

export type ChoiceResult = { run: StoryRun; error?: string };

/**
 * A choice is only accepted once the chapter's narration has finished, so
 * answering can never skip a passage that has not been heard. A choice
 * rewrites the route *after* the current chapter. Decisions are keyed by the
 * question chapter; anything ahead of it belongs to an abandoned branch and
 * leaves with the old path.
 */
export function chooseOption(
  story: Story,
  run: StoryRun,
  choiceId: string,
  expectedVersion = run.version,
): ChoiceResult {
  if (run.version !== expectedVersion) {
    return { run, error: "故事版本已变化，请重新查看当前问题。" };
  }
  if (run.paused) return { run, error: "故事已暂停；继续当前章节后才能作答。" };
  if (run.status !== "choice") {
    return { run, error: "请先听当前章节讲完，再回答问题。" };
  }
  const node = currentNodeOf(story, run);
  if (!node) return { run, error: "当前章节不存在。" };
  const question = node.question;
  if (!question) return { run, error: "当前章节没有需要回答的问题。" };
  const choice = question.options.find((o) => o.id === choiceId);
  if (!choice) return { run, error: "这个选项已不属于当前故事版本。" };
  if (choiceIsClosed(story, choice)) {
    return { run, error: closedReason(story, choice) || "这条分支暂时不可达。" };
  }
  const path = [...run.path.slice(0, run.cursor + 1), choice.next];
  return {
    run: {
      ...run,
      version: run.version + 1,
      path,
      cursor: run.cursor + 1,
      decisions: { ...run.decisions, [node.id]: choice.id },
      status: "walking",
      paused: false,
      notice: null,
    },
  };
}

/**
 * Index of the most recent question chapter strictly before the cursor. That
 * is the only choice the visitor may redo: earlier ones would break the
 * causal order already narrated, and future ones are by definition unheard.
 */
export function lastDecisionIndex(story: Story, run: StoryRun): number {
  for (let i = Math.min(run.cursor, run.path.length - 1) - 1; i >= 0; i--) {
    const node = storyNodeById(story, run.path[i]);
    if (node?.question && run.decisions[node.id]) return i;
  }
  return -1;
}

export type RewindResult = { run: StoryRun; error?: string };

/**
 * Redo the previous choice. The question chapter was already heard, so we
 * land directly on its choices. Everything after it is removed from the
 * *current* route and its decisions are dropped. Facts and rewards live in
 * the gallery document and are intentionally untouched.
 */
export function rewindToPreviousChoice(
  story: Story,
  run: StoryRun,
  expectedVersion = run.version,
): RewindResult {
  if (run.version !== expectedVersion) {
    return { run, error: "故事版本已变化，请重新查看当前章节。" };
  }
  const target = lastDecisionIndex(story, run);
  if (target < 0) {
    return { run, error: "这段故事还没有可以重做的选择。" };
  }
  const node = storyNodeById(story, run.path[target]);
  if (!node) return { run, error: "上一个选择所在章节已不存在。" };
  const path = run.path.slice(0, target + 1);
  const decisions: Record<string, string> = {};
  for (let i = 0; i < target; i++) {
    const decision = run.decisions[run.path[i]];
    if (decision) decisions[run.path[i]] = decision;
  }
  return {
    run: {
      ...run,
      version: run.version + 1,
      path,
      cursor: target,
      decisions,
      status: "choice",
      paused: false,
      notice: `已返回「${node.title}」重新选择。此后的章节不再计入当前路线；已听过的事实与已获得的奖励保留。`,
    },
  };
}

/**
 * Pause invalidates the current narration version. A late end-of-track
 * callback therefore cannot complete a chapter while the visitor is browsing.
 */
export function pauseAway(run: StoryRun): StoryRun {
  if (run.paused || run.status === "done") return run;
  return { ...run, version: run.version + 1, paused: true };
}

/**
 * Continuing re-walks the current chapter and restarts its narration from
 * the first line; a paused chapter never resumes mid-sentence into a state
 * that might auto-complete unseen passages.
 */
export function resumeStory(run: StoryRun): StoryRun {
  if (!run.paused) return run;
  return {
    ...run,
    version: run.version + 1,
    paused: false,
    status:
      run.status === "choice" || run.status === "done" ? run.status : "walking",
  };
}

export function dismissNotice(run: StoryRun): StoryRun {
  if (!run.notice) return run;
  return { ...run, notice: null };
}

/**
 * Validate a persisted run against the current story graph. We accept the
 * longest still-valid prefix, drop decisions that do not belong to it, and
 * always come back in `walking` state so the chapter is re-narrated from its
 * first line instead of skipping unseen passages.
 */
export function restoreRun(raw: unknown, story: Story | null): StoryRun | null {
  if (!story || !raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StoryRun>;
  if (candidate.schemaVersion !== STORY_SCHEMA_VERSION) return null;
  if (candidate.storyId !== story.id) return null;
  if (!Array.isArray(candidate.path) || candidate.path.length === 0) return null;
  if (!candidate.path.every((id) => typeof id === "string")) return null;
  const decisionsIn =
    candidate.decisions && typeof candidate.decisions === "object"
      ? candidate.decisions
      : {};
  const path = candidate.path as string[];

  // Longest valid prefix.
  let validLength = 0;
  let repair: string | null = null;
  for (let i = 0; i < path.length; i++) {
    const node = storyNodeById(story, path[i]);
    if (!node) {
      repair = "恢复时发现旧路线包含已不存在的章节，已回到上一处有效章节。";
      break;
    }
    if (i === 0) {
      if (path[0] !== story.entry) {
        repair = "恢复时发现旧路线并非从故事起点开始，已回到起点。";
        break;
      }
      validLength = 1;
      continue;
    }
    const previous = storyNodeById(story, path[i - 1]);
    if (!previous) break;
    if (previous.question) {
      const chosen = decisionsIn[previous.id];
      const choice = previous.question.options.find((o) => o.id === chosen);
      if (!choice || choice.next !== path[i]) {
        repair = "恢复时发现旧选择与当前故事版本不一致，已回到该选择处。";
        break;
      }
      if (choiceIsClosed(story, choice)) {
        repair = "恢复时发现所走分支的展区已封闭，已回到该选择处。";
        break;
      }
    } else if (previous.next !== path[i]) {
      repair = "恢复时发现旧路线与当前故事版本不一致，已回到上一处有效章节。";
      break;
    }
    validLength = i + 1;
  }
  if (validLength === 0) return null;

  const cursorIn =
    typeof candidate.cursor === "number" && Number.isInteger(candidate.cursor)
      ? candidate.cursor
      : validLength - 1;
  let cursor = Math.max(0, Math.min(cursorIn, validLength - 1));
  let pathOut = path.slice(0, validLength);
  if (cursor < pathOut.length - 1) {
    pathOut = pathOut.slice(0, cursor + 1);
    repair = repair || "恢复时发现旧路线领先于当前进度，已回到当前章节。";
  }
  if (pathOut.length === 0) return null;

  const decisions: Record<string, string> = {};
  for (let i = 0; i < pathOut.length - 1; i++) {
    const node = storyNodeById(story, pathOut[i]);
    if (!node?.question) continue;
    const chosen = decisionsIn[node.id];
    const choice = node.question.options.find((o) => o.id === chosen);
    if (choice && choice.next === pathOut[i + 1]) {
      decisions[node.id] = choice.id;
    } else {
      repair = repair || "恢复时发现旧选择无法再次应用，已回到该选择处。";
      cursor = Math.min(cursor, i);
      pathOut = pathOut.slice(0, i + 1);
      break;
    }
  }

  const lastNode = storyNodeById(story, pathOut[pathOut.length - 1]);
  // A repaired route was cut short, so it cannot be considered finished even
  // if the stale payload claimed so. Only an intact ending restores as done.
  const wasDone =
    candidate.status === "done" &&
    !repair &&
    cursor === pathOut.length - 1 &&
    !!lastNode &&
    !lastNode.question &&
    !lastNode.next;
  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    storyId: story.id,
    version:
      (typeof candidate.version === "number" ? candidate.version : 1) + 1,
    path: pathOut,
    cursor,
    decisions,
    status: wasDone ? "done" : "walking",
    paused: false,
    notice:
      repair ||
      (wasDone
        ? "已恢复上次完成的故事版本。"
        : "已恢复上次的故事版本；当前章节会从开头重新讲解，不会跳过未听过的内容。"),
  };
}
