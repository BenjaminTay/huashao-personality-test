import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { ARCHETYPES } from "../../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../../data/dimensions";
import { RESULT_CONTENT } from "../../data/results";
import { POPULATION_SNAPSHOT } from "../../data/population-stats";
import type { ArchetypeId } from "../../data/types";
import type { QuizResult as ComputedResult } from "../../data/types";
import {
  trackShareCard,
  trackShareCopy,
  trackShareForward,
  trackShareImage,
} from "../../lib/analytics";
import {
  balanceFollowUp,
  buildShareCopy,
  buildSharePosterSpec,
  canShareImageFile,
  getTestEntryUrl,
  normalizeShareName,
  sharePosterPngFile,
  svgToPngBlob,
} from "../share-poster";
import {
  formatSampleCount,
  formatSampleDate,
  getSamplePercent,
  getSampleTotal,
  SAMPLE_PERCENT_MIN,
} from "./quiz-session";

/**
 * 复制文本到剪贴板：优先 Clipboard API，失败时退回隐藏 textarea + execCommand，
 * 兼容部分 WebView（微信等）内的环境。
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续尝试旧路径
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

function ResultShareSheet({
  open,
  onClose,
  sheetRef,
  exporting,
  posterActionDesc,
  shareFeedback,
  onPoster,
  onForward,
  onCopyText,
}: {
  open: boolean;
  onClose: () => void;
  sheetRef: RefObject<HTMLDivElement | null>;
  exporting: boolean;
  posterActionDesc: string;
  shareFeedback: { ok: boolean; text: string } | null;
  onPoster: () => void;
  onForward: () => void;
  onCopyText: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div className="share-sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="分享这份花学档案"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-sheet-head">
          <span>SHARE / 把这份档案带走</span>
          <button type="button" className="share-sheet-close" aria-label="关闭分享面板" onClick={onClose}>✕</button>
        </div>
        <button type="button" className="share-sheet-item" disabled={exporting} onClick={onPoster}>
          <span className="share-sheet-item-title">{exporting ? "正在生成图片…" : "发图：花学档案卡"}</span>
          <span className="share-sheet-item-desc">{posterActionDesc}</span>
        </button>
        <button type="button" className="share-sheet-item" onClick={onForward}>
          <span className="share-sheet-item-title">转发：发给朋友来测</span>
          <span className="share-sheet-item-desc">{typeof navigator !== "undefined" && "share" in navigator ? "调起系统分享面板" : "复制测试链接"}</span>
        </button>
        <button type="button" className="share-sheet-item" onClick={onCopyText}>
          <span className="share-sheet-item-title">配文：复制我的花学文案</span>
          <span className="share-sheet-item-desc">一段介绍 + 花学金句，随附测试链接</span>
        </button>
        <div className="share-sheet-foot">
          <span role="status" aria-live="polite">{shareFeedback ? (shareFeedback.ok ? `✓ ${shareFeedback.text}` : `✗ ${shareFeedback.text}`) : "想给海报写上名字？文末海报区可以定制 ↓"}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 无系统文件分享能力的移动环境（微信/QQ 等 WebView）保存海报的兜底：
 * 把 PNG 作为页面内真实 <img> 渲染，长按才有“保存图片/存储图像”菜单；
 * 直接 window.open 顶层图片页在安卓 WebView 里没有可保存的长按菜单。
 */
function PosterPreviewModal({
  url,
  onClose,
  previewRef,
}: {
  url: string;
  onClose: () => void;
  previewRef: RefObject<HTMLDivElement | null>;
}) {
  if (!url) return null;
  return createPortal(
    <div className="poster-preview-backdrop" onClick={onClose}>
      <div
        ref={previewRef}
        className="poster-preview"
        role="dialog"
        aria-modal="true"
        aria-label="海报预览：长按图片保存到相册"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-sheet-head">
          <span>POSTER PREVIEW / 长按图片保存</span>
          <button type="button" className="share-sheet-close" aria-label="关闭海报预览" onClick={onClose}>✕</button>
        </div>
        {/* 长按保存依赖原生 img 的上下文菜单，blob: 源也无法走 next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="poster-preview-img" src={url} alt="花学人格鉴定海报，长按可保存" />
        <p className="poster-preview-hint">
          长按上面的海报，选择「保存图片 / 保存到相册」即可存入手机。
          <br />
          微信里保存后可从「我 → 相册」里找到并直接发朋友圈。
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function ResultScreen({ result, onRetake }: { result: ComputedResult; onRetake: () => void }) {
  const primary = ARCHETYPES[result.primaryType];
  const secondary = ARCHETYPES[result.secondaryType];
  const leastLike = ARCHETYPES[result.leastLikeType];
  const content = RESULT_CONTENT[result.primaryType];
  const secondaryContent = RESULT_CONTENT[result.secondaryType];
  const sampleTotal = getSampleTotal();
  const sampleDate = formatSampleDate(POPULATION_SNAPSHOT.generatedAt);
  const sampleShowPercent = sampleTotal >= SAMPLE_PERCENT_MIN;
  const ownSamplePercent = getSamplePercent(
    POPULATION_SNAPSHOT.completions[result.primaryType],
    sampleTotal,
  );
  const [shareName, setShareName] = useState("");
  const cleanShareName = normalizeShareName(shareName);
  const testUrl = useMemo(() => getTestEntryUrl(), []);
  const sharePosterSpec = useMemo(
    () => buildSharePosterSpec(primary, content, result.sixDimensionProfile, testUrl, cleanShareName, leastLike),
    [cleanShareName, content, leastLike, primary, result.sixDimensionProfile, testUrl],
  );

  const [prefersShareOverDownload, setPrefersShareOverDownload] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
  });
  const [posterExporting, setPosterExporting] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [shareCapability, setShareCapability] = useState<"file-share" | "long-press">("long-press");
  const shareTriggerRef = useRef<HTMLButtonElement | null>(null);
  const posterMainRef = useRef<HTMLButtonElement | null>(null);
  const shareSheetRef = useRef<HTMLDivElement | null>(null);
  const posterPreviewRef = useRef<HTMLDivElement | null>(null);
  const posterFocusReturnRef = useRef<HTMLButtonElement | null>(null);
  const shareFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareText = useMemo(
    () => buildShareCopy(content, testUrl),
    [content, testUrl],
  );

  useEffect(() => {
    return () => {
      if (shareFeedbackTimer.current) clearTimeout(shareFeedbackTimer.current);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [posterPreviewUrl]);

  useEffect(() => {
    if (!posterPreviewUrl) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPosterPreviewUrl(null);
      posterFocusReturnRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    posterPreviewRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [posterPreviewUrl]);

  useEffect(() => {
    if (!shareSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShareSheetOpen(false);
      setShareFeedback(null);
      if (shareFeedbackTimer.current) clearTimeout(shareFeedbackTimer.current);
      shareTriggerRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    shareSheetRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [shareSheetOpen]);

  function closeShareSheet() {
    setShareSheetOpen(false);
    setShareFeedback(null);
    if (shareFeedbackTimer.current) clearTimeout(shareFeedbackTimer.current);
    shareTriggerRef.current?.focus({ preventScroll: true });
  }

  function openShareSheet() {
    setShareCapability(
      prefersShareOverDownload && canShareImageFile() ? "file-share" : "long-press",
    );
    setShareSheetOpen(true);
  }

  function showShareFeedback(ok: boolean, text: string) {
    setShareFeedback({ ok, text });
    if (shareFeedbackTimer.current) clearTimeout(shareFeedbackTimer.current);
    shareFeedbackTimer.current = setTimeout(() => setShareFeedback(null), 2600);
  }

  function openPosterPreview(url: string, fromSheet: boolean) {
    setShareSheetOpen(false);
    setShareFeedback(null);
    if (shareFeedbackTimer.current) clearTimeout(shareFeedbackTimer.current);
    posterFocusReturnRef.current = fromSheet ? shareTriggerRef.current : posterMainRef.current;
    setPosterPreviewUrl(url);
  }

  function closePosterPreview() {
    setPosterPreviewUrl(null);
    posterFocusReturnRef.current?.focus({ preventScroll: true });
  }

  async function handleSheetPoster(): Promise<void> {
    const previewOpened = await handlePosterAction(true);
    if (!previewOpened && shareSheetOpen) {
      closeShareSheet();
    }
  }

  async function handleForward(): Promise<void> {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `花学测试 · 我测出了${primary.personName}`,
          text: shareText,
          url: testUrl,
        });
        trackShareForward();
        closeShareSheet();
        return;
      } catch {
        // 用户取消或分享面板不可用：落到复制链接路径
      }
    }
    const ok = await copyToClipboard(testUrl);
    if (ok) {
      trackShareForward();
      showShareFeedback(true, "链接已复制，去粘贴给朋友吧");
    } else {
      showShareFeedback(false, "复制失败，请长按手动复制网址");
    }
  }

  async function handleCopyShareText(): Promise<void> {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      trackShareCopy();
      showShareFeedback(true, "花学配文已复制，去粘贴吧");
    } else {
      showShareFeedback(false, "复制失败，请重试");
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setPrefersShareOverDownload(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  /**
   * 海报导出统一入口：先生成一份 1080×1440 PNG Blob，再按环境分流——
   * 桌面/精确指针：直接下载；触屏且支持 Web Share 文件：调起系统分享；
   * 触屏但不支持文件分享（微信等 WebView）：打开页面内预览层供长按保存。
   * 返回 true 表示已切换到长按预览层（此时调用方不应再聚焦回分享面板）。
   */
  async function handlePosterAction(fromSheet: boolean): Promise<boolean> {
    if (posterExporting) return false;
    setPosterExporting(true);
    const baseName = `huaxue-share-poster-${result.primaryType}`;
    try {
      const pngBlob = await svgToPngBlob(sharePosterSpec);
      if (prefersShareOverDownload && canShareImageFile()) {
        trackShareImage();
        await sharePosterPngFile(pngBlob, baseName);
        return false;
      }
      if (prefersShareOverDownload) {
        trackShareImage();
        openPosterPreview(URL.createObjectURL(pngBlob), fromSheet);
        return true;
      }
      trackShareCard();
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      return false;
    } catch {
      // 分享被取消或导出失败时静默，不打断结果页
      return false;
    } finally {
      setPosterExporting(false);
    }
  }

  return (
    <section className="result-screen page-enter" aria-labelledby="result-title">
      <ResultShareSheet
        open={shareSheetOpen}
        onClose={closeShareSheet}
        sheetRef={shareSheetRef}
        exporting={posterExporting}
        posterActionDesc={
          !prefersShareOverDownload
            ? "下载一张 3:4 海报 PNG"
            : shareCapability === "file-share"
              ? "生成海报，用系统分享/保存"
              : "生成海报，长按图片保存到相册"
        }
        shareFeedback={shareFeedback}
        onPoster={() => void handleSheetPoster()}
        onForward={() => void handleForward()}
        onCopyText={() => void handleCopyShareText()}
      />
      <PosterPreviewModal
        url={posterPreviewUrl ?? ""}
        onClose={closePosterPreview}
        previewRef={posterPreviewRef}
      />
      <div className="result-file-head">
        <div><p className="eyebrow"><span className="red-dot" /> PERSONALITY FILE / HXT-002</p><p className="result-timecode">TRAVEL GROUP / FIELD REPORT</p></div>
        <span className={`result-symbol symbol-${primary.visualSymbol}`} aria-hidden="true" />
      </div>
      <div className="result-hero">
        <p className="result-english">{primary.englishName}</p>
        <button
          ref={shareTriggerRef}
          type="button"
          className="hero-share-trigger"
          aria-haspopup="dialog"
          aria-expanded={shareSheetOpen}
          onClick={openShareSheet}
        >
          分享 ↗
        </button>
        <h1 id="result-title">{primary.personName}</h1>
        <p className="result-type-title">{primary.title}</p>
        <p className="result-type-strategy"><span>花学默认姿势</span>{primary.strategy}</p>
        <div className="hero-stack">
          <figure className="recall-card result-hero-quote">
            <blockquote>“{content.recall.quote}”</blockquote>
            <figcaption>
              <p className="recall-note">{content.recall.note}</p>
            </figcaption>
          </figure>
          <aside className="heart-card" aria-label="心眼子状态">
            <p className="heart-card-kicker">心眼子余额</p>
            <strong>{content.heartEyeBalance}</strong>
            <p className="heart-card-copy">{balanceFollowUp(content.heartschemes)}</p>
          </aside>
        </div>
      </div>

      <section className="result-section manual-section" aria-label="人格分析">
        <p className="manual-main">{content.core}</p>
        <h3 className="manual-side-title"><span className="green-dot" aria-hidden="true" />{content.highTitle}</h3>
        <p className="manual-side-body">{content.high}</p>
        <h3 className="manual-side-title"><span className="red-dot" aria-hidden="true" />{content.flawTitle}</h3>
        <p className="manual-side-body">{content.flaw}</p>
        <p className="manual-misread"><span>你可能被误读成</span>{content.misread}</p>
      </section>

      <section className="result-section dimension-section" aria-labelledby="dimensions-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="red-dot" /> 属性面板</p><h2 id="dimensions-title">关系属性面板</h2></div><span className="score-note">0—100 · 按 24 次选择换算</span></div>
        <div className="dimension-grid">
          {DIMENSION_ORDER.map((dimension) => {
            const definition = DIMENSIONS[dimension];
            const score = result.sixDimensionProfile[dimension];
            return (
              <article className="dimension-card" key={dimension} title={definition.description}>
                <div className="dimension-card-head"><strong>{definition.displayName}</strong><b>{score}</b></div>
                <div className="score-bar" role="img" aria-label={`${definition.displayName} ${score} 分`}><span style={{ width: `${score}%` }} /></div>
                <div className="score-labels"><span>{definition.lowLabel}</span><span>{definition.highLabel}</span></div>
              </article>
            );
          })}
        </div>
        <p className="score-footnote">这组属性点，留着跟朋友互相伤害用。</p>
      </section>

      <section className="result-section cast-section" aria-label="第二人格与绝缘人格">
        <div className="cast-grid">
          <article className="cast-card secondary-card">
            <span className="cast-role">第二人格</span>
            <h3>{secondary.personName}</h3>
            <p>{secondary.title}</p>
            <p className="cast-why">全场第二接近你的型：同一套关系现场里，它是你身上的另一套打法，有些题你会和 TA 选得一样。</p>
            <div className="cast-strategy">备用模式：{secondary.strategy}</div>
            <small>{secondaryContent.keywords.join(" · ")}</small>
          </article>
          <article className="cast-card least-card">
            <span className="cast-role">绝缘人格</span>
            <h3>{leastLike.personName}</h3>
            <p>{leastLike.title}</p>
            <p className="cast-why">七型里离你最远的一位：TA 的默认反应和你几乎零重叠，你很难成为 TA，也基本不会吃 TA 那一套。</p>
            <div className="cast-strategy">TA 的默认：{leastLike.strategy}</div>
          </article>
        </div>
      </section>

      <section className="result-section share-section" aria-labelledby="share-title">
        <div className="share-poster-export" role="img" aria-label={`${primary.personName} 花学人格分享海报`}>
          <div className="share-poster-export-art" dangerouslySetInnerHTML={{ __html: sharePosterSpec.svg }} />
        </div>
        <div className="share-copy-block">
          <p className="eyebrow"><span className="red-dot" /> 分享现场</p>
          <h2 id="share-title">把这张海报带走</h2>
          <p>填写姓名后，海报会显示“XXX，你的花少人格是”。</p>
          <div className="share-personalize">
            <label htmlFor="share-name"><span>PERSONALIZE / 姓名</span>姓名（可选）</label>
            <input
              id="share-name"
              name="share-name"
              type="text"
              value={shareName}
              maxLength={10}
              placeholder="请输入姓名"
              autoComplete="nickname"
              onChange={(event) => setShareName(event.target.value)}
              aria-describedby="share-name-help"
            />
            <p id="share-name-help">名字只会出现在你保存的图上。</p>
          </div>
          <button
            ref={posterMainRef}
            className="download-action share-image-action"
            type="button"
            disabled={posterExporting}
            onClick={() => void handlePosterAction(false)}
          >
            <span>{prefersShareOverDownload ? "分享/保存成图片" : "下载我的海报"}</span>
            <span>{prefersShareOverDownload ? "↗" : "↘"}</span>
          </button>
        </div>
      </section>

      <section className="result-section sample-section" aria-labelledby="sample-title">
        <div className="section-heading">
          <div><p className="eyebrow"><span className="red-dot" /> 测友坐标 / 同好分布</p><h2 id="sample-title">一起测过的朋友</h2></div>
          <span className="score-note">{sampleDate ? `截至 ${sampleDate}` : "等待首次采集"}</span>
        </div>
        {sampleTotal > 0 ? (
          <>
            <p className="sample-lead">
              {sampleShowPercent
                ? `已有 ${formatSampleCount(sampleTotal)} 人次完成鉴定，其中 ${ownSamplePercent.toFixed(1)}% 和你同为 ${primary.personName}。`
                : `目前有 ${formatSampleCount(sampleTotal)} 人次完成鉴定，样本还在积累中——把档案卡发出去，让分母变大。`}
            </p>
            <div className="sample-list">
              {(Object.keys(ARCHETYPES) as ArchetypeId[]).map((id) => {
                const count = POPULATION_SNAPSHOT.completions[id];
                const percent = getSamplePercent(count, sampleTotal);
                const isOwn = id === result.primaryType;
                return (
                  <div className={`sample-row${isOwn ? " is-own" : ""}`} key={id}>
                    <span className="sample-name">{ARCHETYPES[id].personName}</span>
                    <div className="score-bar" role="img" aria-label={`${ARCHETYPES[id].personName} ${formatSampleCount(count)} 人次`}>
                      <span style={{ width: count > 0 ? `${Math.max(percent, 3)}%` : "0%" }} />
                    </div>
                    <span className="sample-num">
                      {formatSampleCount(count)}
                      {sampleShowPercent && <i>{percent.toFixed(1)}%</i>}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
            <p className="sample-empty">样本还没开张：你是第一位完成鉴定的吗？把档案卡发给朋友，让“测友坐标”长出来。</p>
          )}
      </section>

      <div className="result-actions"><button className="primary-action" type="button" onClick={onRetake}><span>再测一次</span><span className="action-arrow">↗</span></button><button className="text-action" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到结果顶部 ↑</button></div>
    </section>
  );
}
