import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Heart,
  Maximize,
  MapPin,
  Volume2,
  Compass,
  Move,
  Info,
  X,
  Footprints,
  BookOpen,
  Play,
} from "lucide-react";
import { Viewport, Map } from "../features/space";
import { ArtworkList, ArtworkDetail } from "../features/catalog";
import { TourPanel } from "../features/tours";
import { AudioPlayer } from "../features/narration";
import { CollectionPanel } from "../features/collection";
import { StoryPanel, StoryRecap, StoryDock } from "../features/story";
import { artworks, artworkById } from "../shared/catalog";
import { useGallery } from "./useGallery";
export default function App() {
  const g = useGallery();
  const [tab, setTab] = useState("explore");
  const [mapOpen, setMapOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [side, setSide] = useState("works");
  const [library, setLibrary] = useState("tours");
  const a = artworkById(g.catalog.active);
  const storyRun = g.story.run;
  const storyNode = g.story.node;
  const storyArtwork = storyNode ? artworkById(storyNode.artworkId) : null;
  const storyOn = !!storyRun && !!storyNode;
  // A restored or newly started run should surface its panel, including after
  // the visitor refreshes the page.
  useEffect(() => {
    if (g.story.run) setLibrary("story");
  }, [g.story.run?.storyId]);
  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          <span className="brand-mark">余</span>
          <span>
            余境<small>YUJING ART SPACE</small>
          </span>
        </a>
        <nav>
          <button
            className={tab === "explore" ? "selected" : ""}
            onClick={() => setTab("explore")}
          >
            探索展馆
          </button>
          <button
            className={tab === "journeys" ? "selected" : ""}
            onClick={() => setTab("journeys")}
          >
            主题导览
          </button>
          <button
            className={tab === "collection" ? "selected" : ""}
            onClick={() => setTab("collection")}
          >
            我的收藏{" "}
            <span className="count">
              {g.collection.document.favorites.length}
            </span>
          </button>
        </nav>        <div className="header-meta">
          <span className="live-dot" />
          线上展览 · 全天开放
          <button
            className="icon-button"
            aria-label="操作帮助"
            onClick={() => setHelp(true)}
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <main>
        <aside className="left-sidebar">
          <div className="exhibition-intro">
            <div className="eyebrow">
              CURRENT EXHIBITION <span>展览 001</span>
            </div>
            <h1>万物之间</h1>
            <p className="english-title">BETWEEN ALL THINGS</p>
            <p className="intro-text">
              当自然、空间与想象相遇
              <br />
              一场不受边界限制的艺术漫游。
            </p>
            <div className="exhibition-meta">
              <span>6 件作品</span>
              <span>6 位艺术家</span>
              <span>约 12 分钟</span>
            </div>
          </div>
          <div className="sidebar-tabs">
            <button
              className={side === "works" ? "active" : ""}
              onClick={() => setSide("works")}
            >
              展出作品 <small>06</small>
            </button>
            <button
              className={side === "map" ? "active" : ""}
              onClick={() => setSide("map")}
            >
              空间地图
            </button>
          </div>
          {side === "works" ? (
            <ArtworkList active={g.catalog.active} onSelect={g.go} />
          ) : (
            <Map
              position={g.walker.position}
              active={g.catalog.active}
              onSelect={g.go}
              large
            />
          )}
          <TourPanel
            state={g.tour.state}
            onStart={g.startTour}
            onPause={g.pauseTour}
            onResume={g.tour.resume}
            onStop={g.stopTour}
            onNext={g.nextTour}
          />
          <div className="sidebar-footer">
            <Compass size={15} />
            <span>慢下来，遇见艺术的另一面。</span>
          </div>
        </aside>
        <section className="center">
          <div className="view-heading">
            <div>
              <span className="eyebrow">THE VIRTUAL GALLERY</span>
              <h2>
                步入一场艺术的漫游<span>01 / 主展厅</span>
              </h2>
            </div>
            <button className="text-button" onClick={() => setHelp(true)}>
              参观指南
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="scene-wrap">
            <Viewport
              position={g.walker.positionRef}
              yaw={g.walker.yaw}
              onSelect={g.go}
            />
            <div className="scene-top">
              <span data-testid="scene-mode">
                <span className="live-dot" />
                {g.reviewNode
                  ? `回看 · ${g.reviewNode.title}`
                  : storyRun
                    ? `${g.story.story?.name} · 故事版本 v${storyRun.version}`
                    : "自由探索中"}
              </span>
              <button
                className="glass-button"
                aria-label="全屏展馆"
                onClick={() => {
                  const el = document.querySelector(".scene-wrap");
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else void el?.requestFullscreen();
                }}
              >
                <Maximize size={16} />
              </button>
            </div>
            <div className="center-cross">+</div>
            <div className="scene-location">
              <MapPin size={15} />
              {storyOn && !g.reviewNode && !storyRun?.paused
                ? storyArtwork?.title
                : g.catalog.nearby
                  ? a?.title
                  : "万物之间 · 主展厅"}
              <small>
                {g.reviewNode
                  ? "正在回看已走过的章节 · 不影响当前路线"
                  : storyOn
                    ? storyRun?.paused
                      ? "故事已暂停 · 自由浏览，继续后回到故事作品前"
                      : storyRun?.status === "walking"
                        ? "故事正在前往作品前"
                        : storyRun?.status === "choice"
                          ? "请回答当前问题 · 故事等待你的选择"
                          : storyRun?.status === "done"
                            ? "当前路线已完成 · 可回看或重做选择"
                            : "故事讲解中 · 与字幕同步"
                    : g.catalog.nearby
                      ? "靠近作品 · 可收听讲解"
                      : "拖动视角，发现你的下一次共鸣"}
              </small>
            </div>
            <div
              className="mini-map"
              onClick={() => setMapOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="展开地图"
              onKeyDown={(e) => {
                if (e.key === "Enter") setMapOpen(true);
              }}
            >
              <span>空间导航 ↗</span>
              <Map
                position={g.walker.position}
                active={g.catalog.active}
                onSelect={g.go}
              />
            </div>
            <div className="scene-controls">
              <span>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> 行走
              </span>
              <span>
                <Move size={14} />
                拖动切换视角
              </span>
              <span>
                <Heart size={14} />
                收藏所见
              </span>
            </div>
          </div>
          <div className="scene-caption">
            <span>
              {g.reviewNode
                ? "回看只复读听过的事实，不改变故事因果。"
                : storyOn
                  ? "空间、字幕与回顾使用同一故事版本。"
                  : "让每一次停留，都成为一次发现。"}
            </span>
            <span>
              沉浸式三维艺术体验 <Volume2 size={14} />
            </span>
          </div>
          <div className="discover-strip">
            <div>
              <span className="eyebrow">A MOMENT OF DISCOVERY</span>
              <h3>你的回答，决定下一段路。</h3>
              <p>
                在指定作品前回答问题，分支路线与讲解随之改变；同一件作品可以再次经过，语境不同，收藏中仍只有一件。
              </p>
            </div>
            <button
              onClick={() => {
                if (g.story.run) {
                  setTab("journeys");
                  setLibrary("story");
                } else {
                  g.startStory("echo-path");
                  setTab("journeys");
                  setLibrary("story");
                }
              }}
            >
              {g.story.run ? "回到策展故事" : "开启分支故事"}
              <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="art-tags">
            {artworks.slice(0, 3).map((art, i) => (
              <button key={art.id} onClick={() => g.go(art.id)}>
                <span style={{ background: art.color }} />0{i + 1} · {art.title}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </section>
        <aside className="right-sidebar">
          {tab === "collection" ? (
            <>
              <CollectionPanel
                document={g.collection.document}
                run={g.story.run}
                onSelect={g.go}
                onNote={g.collection.note}
                onToggle={g.collection.toggle}
              />
              <StoryRecap
                recap={g.storyRecap}
                onReview={(id) => {
                  g.reviewStory(id);
                  setTab("journeys");
                  setLibrary("story");
                }}
              />
            </>
          ) : tab === "journeys" ? (
            <>
              <div className="journey-intro">
                <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
                <h2>沿着共鸣，出发。</h2>
                <p>
                  主题导览按固定顺序前行；策展故事由你的回答分岔，并允许回到上一个选择重做。
                </p>
              </div>
              <div className="library-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={library === "tours"}
                  className={library === "tours" ? "active" : ""}
                  onClick={() => setLibrary("tours")}
                >
                  <Footprints size={13} /> 主题导览
                </button>
                <button
                  role="tab"
                  aria-selected={library === "story"}
                  className={library === "story" ? "active" : ""}
                  onClick={() => setLibrary("story")}
                >
                  <BookOpen size={13} /> 策展故事
                  {g.story.run && <span className="live-dot" />}
                </button>
              </div>
              {library === "story" ? (
                <StoryPanel
                  run={g.story.run}
                  story={g.story.story}
                  node={g.story.node}
                  choices={g.story.choices}
                  error={g.story.error}
                  document={g.collection.document}
                  onStart={g.startStory}
                  onChoose={g.chooseStory}
                  onRewind={g.rewindStory}
                  onPause={g.pauseStory}
                  onResume={g.resumeStory}
                  onStop={g.stopStory}
                  onReview={g.reviewStory}
                  onDismissNotice={g.story.clearNotice}
                  onDismissError={g.story.dismissError}
                />
              ) : (
                <TourPanel
                  state={g.tour.state}
                  onStart={g.startTour}
                  onPause={g.pauseTour}
                  onResume={g.tour.resume}
                  onStop={g.stopTour}
                  onNext={g.nextTour}
                />
              )}
              {g.reviewNode && (
                <div className="review-banner" role="status">
                  <Play size={13} />
                  正在回看「{g.reviewNode.title}」· 不影响当前路线
                  <button onClick={g.stopReview}>返回故事</button>
                </div>
              )}
            </>
          ) : (
            <ArtworkDetail
              id={g.catalog.active}
              saved={g.collection.document.favorites.includes(
                g.catalog.active || "",
              )}
              savedCount={g.collection.document.favorites.length}
              revisitNote={g.storyRevisitNote}
              onFavorite={() => {
                if (g.catalog.active) g.collection.toggle(g.catalog.active);
              }}
              onListen={() => {
                if (g.catalog.active) g.listenToArtwork(g.catalog.active);
              }}
              onGo={() => {
                if (g.catalog.active) g.go(g.catalog.active);
              }}
            />
          )}
          <div className="right-bottom">
            <span className="quote-mark">“</span>
            <p>
              艺术不是你看到的东西，
              <br />
              而是你让别人看到的东西。
            </p>
            <small>— 埃德加 · 德加</small>
          </div>
        </aside>
      </main>
      {g.collection.storageError && (
        <div className="storage-error">
          浏览器存储已满，本次更改暂未保存，请下载回顾。
        </div>
      )}
      <AudioPlayer
        state={g.narration.state}
        caption={g.narration.caption}
        supported={g.narration.supported}
        onToggle={g.narration.toggle}
        onSeek={g.narration.seek}
        onRate={g.narration.rate}
      />
      <StoryDock
        run={storyRun}
        story={g.story.story}
        node={storyNode}
        paused={!!storyRun?.paused}
        status={storyRun?.status || "idle"}
        onResume={g.resumeStory}
        onRewind={g.rewindStory}
        onOpen={() => {
          setTab("journeys");
          setLibrary("story");
        }}
      />
      {(mapOpen || help) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setMapOpen(false);
            setHelp(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={help ? "参观指南" : "空间导航"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="关闭弹窗"
              className="icon-button modal-close"
              onClick={() => {
                setMapOpen(false);
                setHelp(false);
              }}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">YUJING ART SPACE</div>
            <h2>{help ? "按照自己的节奏，探索。" : "你在这里。"}</h2>
            {help ? (
              <>
                <p>使用 W / A / S / D 或方向键自由行走；拖动画面转动视角。</p>
                <p>
                  点击画中的作品或左侧列表，自动前往。靠近作品后，右侧切换介绍。
                </p>
                <p>
                  主题导览按固定顺序前行。策展故事会在指定作品前提问，你的回答决定下一段路线与讲解；可以返回一个选择重做，已听过的事实和奖励保留。
                </p>
                <p>
                  讲解由设备的中文语音合成播放；没有中文语音时仍可阅读同步字幕。同一件作品再次经过时，空间、字幕与回顾会使用同一个故事版本。
                </p>
              </>
            ) : (
              <Map
                position={g.walker.position}
                active={g.catalog.active}
                onSelect={(id) => {
                  g.go(id);
                  setMapOpen(false);
                }}
                large
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
