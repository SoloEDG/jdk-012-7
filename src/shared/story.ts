import type {
  Artwork,
  NarrationTrack,
  Story,
  StoryChoice,
  StoryNode,
  StoryRun,
} from "./types";
import { artworkById } from "./catalog";

export const stories: Story[] = [
  {
    id: "echo-path",
    name: "回声之径",
    subtitle: "在潮汐、山脊与光之间，做出你的选择。同一条路，会因你的回答而改变。",
    entry: "n-tide",
    closedZones: {
      west: "西侧长廊正在布展，暂时封闭；可经山径绕行。",
    },
    nodes: {
      "n-tide": {
        id: "n-tide",
        artworkId: "a2",
        title: "第一章 · 潮水退去",
        lead: "故事从无声的潮汐开始。你的第一个回答，会决定接下来经过的空间。",
        transcript: [
          "你站在潮水刚刚退去的位置。这里没有真正的海，只有一遍遍返照的光。",
          "这一次，请先不要急着向前。问问自己：你想沿着哪一种痕迹继续？",
          "答案没有对错，但它会决定你接下来经过的展厅，以及你将听见的故事。",
        ],
        duration: 26,
        question: {
          prompt: "潮水退去，你想沿着哪一道痕迹继续？",
          options: [
            {
              id: "to-mountain",
              label: "沿潮痕向内陆走",
              note: "山脊的层叠等待被重新辨认",
              next: "n-mountain",
            },
            {
              id: "to-light",
              label: "追随水面的返照",
              note: "光被切成薄片，落在展厅东侧",
              next: "n-light",
            },
            {
              id: "to-west",
              label: "穿过西侧长廊",
              note: "浮游之城悬在长廊尽头",
              next: "n-floating",
              zone: "west",
            },
          ],
        },
      },
      "n-mountain": {
        id: "n-mountain",
        artworkId: "a1",
        title: "第二章 · 山的记忆",
        lead: "同一个展厅，在不同的路线里会有不同的含义。",
        transcript: [
          "潮痕把你带向内陆。山脊在墙上层层叠起，像一段被折叠的时间。",
          "第一次经过这里，山是记忆的形状；稍后你或许会从另一条路回来，那时它会是回声。",
          "在继续向上之前，你想把哪一段留在身后？",
        ],
        duration: 28,
        question: {
          prompt: "山脊的褶皱里，你想听见哪一种回声？",
          options: [
            {
              id: "higher",
              label: "让回声继续向上",
              note: "前往浮游之城，看失重之后的山",
              next: "n-floating",
            },
            {
              id: "return",
              label: "回到潮水退去处，再听一次",
              note: "故事会再次经过潮汐与这座山，但语境不同",
              next: "n-tide-again",
            },
          ],
        },
      },
      "n-tide-again": {
        id: "n-tide-again",
        artworkId: "a2",
        title: "回声路线 · 潮汐的第二次回返",
        lead: "同一件作品再次出现。这一次，你已经有了一段山路的记忆。",
        transcript: [
          "你又一次站在潮水退去处。与第一次不同，你已经见过山的层叠。",
          "同一片紫色返照，此刻像是在回应山脊的曲线，而不是邀请你出发。",
          "作品没有改变，改变的是你抵达它的方式。",
        ],
        duration: 24,
        next: "n-mountain-after",
      },
      "n-mountain-after": {
        id: "n-mountain-after",
        artworkId: "a1",
        title: "回声路线 · 山之后的记忆",
        lead: "再次经过山。讲解不再介绍作品，而是比较你两次看见它的方式。",
        transcript: [
          "你回到了山的另一种记忆。第一次它是目的地，这一次它是回程。",
          "层叠的色域不再指向远方，而像在清点你走过的两段路。",
          "同一件作品，在被再次经过时，长出了新的语境。",
        ],
        duration: 24,
        next: "n-vessel",
      },
      "n-light": {
        id: "n-light",
        artworkId: "a3",
        title: "第二章 · 光的切片",
        lead: "潮水的返照把你带到东侧，午后的光被切成薄片。",
        transcript: [
          "水面的光在这里被截取、平移，重新排成一列安静的色块。",
          "每一块暖色都标记着一个已经过去的时刻。",
          "光走到尽头时，你必须在暗处与容器之间做选择。",
        ],
        duration: 27,
        question: {
          prompt: "光的边缘，你想走向哪里？",
          options: [
            {
              id: "dark",
              label: "走进光背后的暗处",
              note: "去看夜的生长",
              next: "n-night",
            },
            {
              id: "vessel",
              label: "沿光走到尽头",
              note: "直接前往时间的容器",
              next: "n-vessel",
            },
          ],
        },
      },
      "n-floating": {
        id: "n-floating",
        artworkId: "a4",
        title: "第三章 · 浮游之城",
        lead: "山路把你带到一座没有地面的城市。",
        transcript: [
          "建筑被从地表轻轻托起，像群岛一样悬在半空。",
          "失去重力之后，距离不再由地图决定，而由你愿意靠近谁决定。",
          "从这里再往前走，就是时间的容器。",
        ],
        duration: 25,
        next: "n-vessel",
      },
      "n-night": {
        id: "n-night",
        artworkId: "a5",
        title: "第三章 · 夜的生长",
        lead: "你走进光背后的暗处。",
        transcript: [
          "微小的光点在黑暗里聚集，像植物，也像星系。",
          "它们只遵循很简单的规则，却共同长成了无法预测的形状。",
          "暗处也有出口，它通向时间的容器。",
        ],
        duration: 23,
        next: "n-vessel",
      },
      "n-vessel": {
        id: "n-vessel",
        artworkId: "a6",
        title: "终章 · 时间的容器",
        lead: "所有分支都在这里汇合。",
        transcript: [
          "重复的圆环彼此穿过，却不指向同一个终点。",
          "你走过的每一条路都留在这个容器里，但它们不会互相覆盖。",
          "故事到这里结束。你可以返回上一个选择，看看另一条路；也可以保留此刻的版本。",
        ],
        duration: 30,
        next: null,
      },
    },
  },
];

export function storyById(id: string | null): Story | null {
  return stories.find((s) => s.id === id) || null;
}

export function storyNode(story: Story, id: string): StoryNode | null {
  return story.nodes[id] || null;
}

export function currentNode(story: Story | null, run: StoryRun | null) {
  if (!story || !run) return null;
  return storyNode(story, run.path[run.cursor]);
}

export function choiceIsClosed(story: Story, choice: StoryChoice): boolean {
  return !!choice.zone && !!story.closedZones[choice.zone];
}

export function closedReason(story: Story, choice: StoryChoice): string {
  return choice.zone ? story.closedZones[choice.zone] || "" : "";
}

export function storyTrack(
  story: Story,
  node: StoryNode,
  version: number,
): NarrationTrack {
  const artwork = artworkById(node.artworkId);
  return {
    id: `story:${story.id}:${node.id}:v${version}`,
    title: `${node.title} · ${artwork?.title || ""}`,
    transcript: node.transcript,
    duration: node.duration,
    meta: {
      kind: "story",
      storyId: story.id,
      nodeId: node.id,
      version,
    },
  };
}

export function reviewTrack(story: Story, node: StoryNode): NarrationTrack {
  const artwork = artworkById(node.artworkId);
  return {
    id: `review:${story.id}:${node.id}`,
    title: `回看 · ${node.title} · ${artwork?.title || ""}`,
    transcript: node.transcript,
    duration: node.duration,
    meta: { kind: "review", storyId: story.id, nodeId: node.id },
  };
}

export function artworkTrack(artwork: Artwork): NarrationTrack {
  return {
    id: `artwork:${artwork.id}`,
    title: artwork.title,
    transcript: artwork.transcript,
    duration: artwork.duration,
    meta: { kind: "artwork", artworkId: artwork.id },
  };
}
