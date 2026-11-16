import {
  Route,
  ArrowRight,
  ArrowLeft,
  Lock,
  Pause,
  Play,
  RotateCcw,
  X,
  Check,
} from "lucide-react";
import { stories } from "../../../shared/story";
import { artworkById } from "../../../shared/catalog";
import type {
  GalleryDocument,
  Story,
  StoryNode,
  StoryRecapSnapshot,
  StoryRun,
} from "../../../shared/types";
import { buildStoryRecap } from "../model/useStory";

export type ChoiceView = {
  id: string;
  label: string;
  note: string;
  closed: boolean;
  closedNote: string;
};

export function StoryPanel({
  run,
  story,
  node,
  choices,
  error,
  document,
  onStart,
  onChoose,
  onRewind,
  onPause,
  onResume,
  onStop,
  onReview,
  onDismissNotice,
  onDismissError,
}: {
  run: StoryRun | null;
  story: Story | null;
  node: StoryNode | null;
  choices: ChoiceView[];
  error: string | null;
  document: GalleryDocument;
  onStart: (id: string) => void;
  onChoose: (id: string) => void;
  onRewind: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReview: (nodeId: string) => void;
  onDismissNotice: () => void;
  onDismissError: () => void;
}) {
  if (!run || !story || !node) {
    return (
      <section className="tour-panel story-panel">
        <div className="section-title">
          <Route size={16} />
          <span>策展故事</span>
          <small>BRANCHING STORIES</small>
        </div>
        {stories.map((s, i) => (
          <button
            className={"route-card route-" + i}
            key={s.id}
            onClick={() => onStart(s.id)}
          >
            <span>
              STORY 0{i + 1}
              <span>分支叙事 · 约 3 分钟</span>
            </span>
            <h3>
              {s.name}
              <span className="round-arrow">↗</span>
            </h3>
            <p>{s.subtitle}</p>
          </button>
        ))}
        <p className="story-hint">
          在指定作品前回答一个问题，答案会决定下一段路线与讲解。走过同一件作品时，语境会改变，但收藏中只保留一件作品。
        </p>
      </section>
    );
  }

  const recap = buildStoryRecap(story, run, document);
  const artwork = artworkById(node.artworkId);
  const answered = run.decisions[node.id];
  const canRewind = run.cursor > 0;
  return (
    <section className="tour-panel story-panel" data-testid="story-panel">
      <div className="section-title">
        <Route size={16} />
        <span>策展故事</span>
        <small>故事版本 v{run.version}</small>
      </div>
      <div className="current-tour story-current">
        <span className="eyebrow">
          {story.name} ·{" "}
          {run.status === "done"
            ? "已完成"
            : `第 ${run.cursor + 1} / ${run.path.length} 段`}
        </span>
        <h3>{node.title}</h3>
        <p className="story-artwork">
          作品 · {artwork?.title}
          {artwork ? ` — ${artwork.artist}` : ""}
        </p>
        <p className="story-lead">{node.lead}</p>

        {run.paused && <p className="story-status">故事已暂停：自由浏览不会改变当前分支。</p>}
        {!run.paused && run.status === "walking" && (
          <p className="story-status">正在前往作品前…</p>
        )}
        {!run.paused && run.status === "playing" && (
          <p className="story-status">讲解进行中，听完后此处会出现问题或下一章。</p>
        )}
        {!run.paused && run.status === "choice" && (
          <div className="story-question" role="group" aria-label="故事选择">
            <p className="story-prompt">{node.question?.prompt}</p>
            {choices.map((c) => (
              <button
                key={c.id}
                className={
                  "story-choice" +
                  (c.closed ? " closed" : "") +
                  (answered === c.id ? " chosen" : "")
                }
                disabled={c.closed}
                onClick={() => onChoose(c.id)}
                title={c.closed ? c.closedNote : c.note}
              >
                <span>{c.label}</span>
                <small>{c.closed ? c.closedNote || "暂时不可达" : c.note}</small>
                {c.closed ? <Lock size={13} /> : <ArrowRight size={13} />}
              </button>
            ))}
            {answered && (
              <p className="story-hint">
                想换一条路？用「重做上个选择」。只有上一个已作答的选择能重做。
              </p>
            )}
          </div>
        )}
        {!run.paused && run.status === "done" && (
          <div className="story-complete">
            <p>
              <Check size={14} /> 故事已完成。当前路线 {recap?.routeRewardCount || 0}{" "}
              / {run.path.length} 段已记录
              {recap && recap.rewardCount > recap.routeRewardCount
                ? `（${recap.rewardCount - recap.routeRewardCount} 段来自已放弃的路径，不计入当前完成度）`
                : ""}
              。
            </p>
            <p className="story-hint">
              重做选择会改变之后的路线；已听过的事实与已获得的章节记录会保留，且不会重复发放。
            </p>
          </div>
        )}

        {run.notice && (
          <div className="story-notice" role="status">
            {run.notice}
            <button aria-label="关闭提示" onClick={onDismissNotice}>
              ×
            </button>
          </div>
        )}
        {error && (
          <div className="story-error" role="alert">
            {error}
            <button aria-label="关闭错误" onClick={onDismissError}>
              ×
            </button>
          </div>
        )}

        <div className="tour-controls">
          <button
            onClick={run.paused ? onResume : onPause}
            disabled={run.status === "done"}
          >
            {run.paused ? <Play size={14} /> : <Pause size={14} />}
            {run.paused ? "继续故事" : "暂停"}
          </button>
          <button
            onClick={onRewind}
            disabled={!canRewind}
            title={canRewind ? "返回上一个已作答的选择" : "还没有可以重做的选择"}
          >
            <RotateCcw size={14} />
            重做上个选择
          </button>
          <button aria-label="结束故事" onClick={onStop}>
            <X size={14} />
          </button>
        </div>
      </div>

      <StoryRoutePath story={story} run={run} onReview={onReview} />
    </section>
  );
}

function StoryRoutePath({
  story,
  run,
  onReview,
}: {
  story: Story;
  run: StoryRun;
  onReview: (nodeId: string) => void;
}) {
  return (
    <div className="story-path" aria-label="当前故事路线">
      <span className="eyebrow">当前路线 · 重做只回退一步</span>
      <ol>
        {run.path.map((nodeId, index) => {
          const n = story.nodes[nodeId];
          const art = n ? artworkById(n.artworkId) : null;
          const isCurrent = index === run.cursor;
          return (
            <li
              key={`${nodeId}-${index}`}
              className={
                isCurrent ? "current" : index < run.cursor ? "past" : "future"
              }
            >
              <button
                className="story-path-link"
                onClick={() => onReview(nodeId)}
                aria-label={`回看 ${n?.title || nodeId}`}
              >
                <span>{n?.title || nodeId}</span>
                <small>{art?.title}</small>
                {isCurrent && <em>当前</em>}
              </button>
            </li>
          );
        })}
      </ol>
      {run.cursor > 0 && (
        <p className="story-hint">
          <ArrowLeft size={12} /> 回看只播放该段讲解，不会改变路线；要改答案请在章节中重做上个选择。
        </p>
      )}
    </div>
  );
}

export function StoryDock({
  run,
  story,
  node,
  paused,
  status,
  onResume,
  onRewind,
  onOpen,
}: {
  run: StoryRun | null;
  story: Story | null;
  node: StoryNode | null;
  paused: boolean;
  status: StoryRun["status"] | "idle";
  onResume: () => void;
  onRewind: () => void;
  onOpen: () => void;
}) {
  if (!run || !story || !node) return null;
  const artwork = artworkById(node.artworkId);
  return (
    <div className="story-dock" role="status" data-testid="story-dock">
      <span className="live-dot" />
      <div className="story-dock-text">
        <small>
          {story.name} · 故事版本 v{run.version}
        </small>
        <strong>
          {node.title}
          {artwork ? ` · ${artwork.title}` : ""}
        </strong>
        <em>
          {paused
            ? "已暂停：自由浏览不会改变当前分支"
            : status === "walking"
              ? "正在前往作品前"
              : status === "playing"
                ? "讲解进行中"
                : status === "choice"
                  ? "等待你的回答"
                  : "当前路线已完成"}
        </em>
      </div>
      {paused ? (
        <button onClick={onResume}>继续故事</button>
      ) : run.cursor > 0 ? (
        <button onClick={onRewind}>重做上个选择</button>
      ) : null}
      <button className="story-dock-open" onClick={onOpen}>
        打开故事
      </button>
    </div>
  );
}

export function StoryRecap({
  recap,
  onReview,
}: {
  recap: StoryRecapSnapshot | null;
  onReview: (nodeId: string) => void;
}) {
  if (!recap) return null;
  return (
    <section className="story-recap" data-testid="story-recap">
      <div className="eyebrow">
        STORY RECAP · 故事回顾
        <span>v{recap.version}</span>
      </div>
      <h3>{recap.storyName}</h3>
      <p className="story-recap-status">
        {recap.completed
          ? "当前路线已完成"
          : recap.status === "paused"
            ? "当前路线已暂停"
            : "当前路线进行中"}
        {` · 当前路线 ${recap.routeRewardCount} / ${recap.chapters.length} 段已记录`}
        {recap.abandonedFactCount > 0 &&
          ` · ${recap.abandonedFactCount} 条事实位于已放弃的路径，仅保留记录、不计入当前路线`}
      </p>
      <ul className="story-recap-chapters">
        {recap.chapters.map((c) => (
          <li key={c.nodeId} className={c.current ? "current" : ""}>
            <button onClick={() => onReview(c.nodeId)}>
              {c.title}
              <small>{c.artworkTitle}</small>
            </button>
          </li>
        ))}
      </ul>
      {recap.facts.length > 0 && (
        <ul className="story-facts">
          {recap.facts.map((f) => (
            <li
              key={f.nodeId + ":" + f.line}
              className={f.abandoned ? "abandoned" : ""}
            >
              <span>{f.text}</span>
              <small>
                {f.nodeTitle}
                {f.abandoned ? " · 已放弃路径" : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
