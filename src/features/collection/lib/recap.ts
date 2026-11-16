import type { GalleryDocument, StoryRun } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";
import { storyById } from "../../../shared/story";
export function recapStats(d: GalleryDocument) {
  return {
    seen: d.visits.filter((v) => v.seconds >= 2).length,
    seconds: Math.round(d.visits.reduce((n, v) => n + v.seconds, 0)),
    saved: d.favorites.length,
    facts: d.storyFacts.length,
    chapters: d.storyRewards.length,
  };
}
export function createRecap(d: GalleryDocument, run?: StoryRun | null): string {
  const stats = recapStats(d);
  const routeIds = new Set(run?.path || []);
  const storyLines = d.storyFacts
    .slice()
    .sort((a, b) => a.at - b.at)
    .map((f) => {
      const story = storyById(f.storyId);
      const node = story?.nodes[f.nodeId];
      const artwork = artworkById(f.artworkId);
      const abandoned = run && f.storyId === run.storyId && !routeIds.has(f.nodeId);
      return `${story?.name || f.storyId} · ${node?.title || f.nodeId} · ${artwork?.title || f.artworkId}${abandoned ? "（已放弃路径，记录保留）" : ""}
${node?.transcript[f.line] || ""}`;
    });
  return [
    "余境 · 我的参观回顾",
    `观看 ${stats.seen} 件作品 · 停留 ${stats.seconds} 秒 · 收藏 ${stats.saved} 件`,
    `故事事实 ${stats.facts} 条 · 章节记录 ${stats.chapters} 次`,
    ...storyLines,
    "",
    ...d.favorites.map((id) => {
      const a = artworkById(id);
      return a
        ? `${a.title} / ${a.artist}
${d.notes[id] || "未添加感想"}
停留 ${Math.round(d.visits.find((v) => v.id === id)?.seconds || 0)} 秒`
        : "";
    }),
  ].join("\n\n");
}
