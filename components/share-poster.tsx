"use client";

import QRCode from "qrcode";
import type { Archetype } from "../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../data/dimensions";
import type { PersonalityResultContent } from "../data/results";
import type { DimensionId, DimensionVector, VisualSymbol } from "../data/types";

const PAPER = "#f6f0e5";
const PAPER_DEEP = "#e8dece";
const INK = "#20251f";
const MUTED = "#73766d";
const SERIF_STACK =
  "'Noto Serif SC','Source Han Serif SC','Songti SC','STSong','SimSun',serif";

const SYMBOL_PALETTES: Record<VisualSymbol, { accent: string; secondary: string; wash: string }> = {
  map: { accent: "#b64c3e", secondary: "#4c7180", wash: "#e8e0d2" },
  truth: { accent: "#87392f", secondary: "#778c68", wash: "#eee1d8" },
  boundary: { accent: "#557465", secondary: "#b64c3e", wash: "#e4e7dc" },
  "error-log": { accent: "#a34439", secondary: "#4c7180", wash: "#eee0d9" },
  exit: { accent: "#9a6b38", secondary: "#778c68", wash: "#eee5d1" },
  repair: { accent: "#3f6978", secondary: "#b64c3e", wash: "#dfe9e8" },
  tourist: { accent: "#a85b3f", secondary: "#778c68", wash: "#eee7d5" },
};

interface QrMatrix {
  size: number;
  modules: boolean[][];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxLength: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const character of Array.from(value)) {
    if (character === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    line += character;
    if (Array.from(line).length >= maxLength) {
      lines.push(line);
      line = "";
    }
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
}

export function getTopDimensionIds(displayScores: DimensionVector): DimensionId[] {
  return [...DIMENSION_ORDER]
    .sort((left, right) => displayScores[right] - displayScores[left] || DIMENSION_ORDER.indexOf(left) - DIMENSION_ORDER.indexOf(right))
    .slice(0, 2);
}

function createQrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value || ".", { errorCorrectionLevel: "M" });
  return {
    size: qr.modules.size,
    modules: Array.from({ length: qr.modules.size }, (_, row) =>
      Array.from({ length: qr.modules.size }, (_, column) => qr.modules.get(row, column) === 1),
    ),
  };
}

function qrPath(matrix: QrMatrix, x: number, y: number, moduleSize: number): string {
  const paths: string[] = [];
  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (!matrix.modules[row][column]) continue;
      const left = x + column * moduleSize;
      const top = y + row * moduleSize;
      paths.push(`M${left.toFixed(2)} ${top.toFixed(2)}h${moduleSize.toFixed(2)}v${moduleSize.toFixed(2)}h-${moduleSize.toFixed(2)}z`);
    }
  }
  return paths.join("");
}

function symbolSvg(symbol: VisualSymbol, color: string, secondary: string, x: number, y: number, scale: number): string {
  const common = `fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
  const transform = `transform="translate(${x} ${y}) scale(${scale})"`;
  switch (symbol) {
    case "map":
      return `<g ${transform} ${common}><path d="M8 76C20 51 31 63 39 39S62 35 72 16"/><circle cx="8" cy="76" r="5" fill="${secondary}" stroke="none"/><circle cx="72" cy="16" r="7" fill="${color}" stroke="none"/><path d="M14 92H80" stroke="${secondary}" stroke-dasharray="3 8"/></g>`;
    case "truth":
      return `<g ${transform} ${common}><path d="M4 49s16-27 46-27 46 27 46 27-16 27-46 27S4 49 4 49Z"/><circle cx="50" cy="49" r="13" fill="${secondary}" stroke="none"/><circle cx="50" cy="49" r="5" fill="${PAPER}" stroke="none"/></g>`;
    case "boundary":
      return `<g ${transform} ${common}><rect x="14" y="14" width="72" height="72" rx="2"/><path d="M50 14v72M14 50h72" stroke="${secondary}" stroke-dasharray="5 7"/><path d="M31 31h38v38H31z" stroke="${color}"/></g>`;
    case "error-log":
      return `<g ${transform} ${common}><rect x="16" y="12" width="68" height="76"/><path d="M29 32h42M29 48h25M29 64h33" stroke="${secondary}"/><path d="m68 67 17 17M85 67 68 84" stroke="${color}"/></g>`;
    case "exit":
      return `<g ${transform} ${common}><path d="M19 16v68h39"/><path d="M45 50h42M68 30l20 20-20 20" stroke="${color}"/><circle cx="20" cy="16" r="4" fill="${secondary}" stroke="none"/></g>`;
    case "repair":
      return `<g ${transform} ${common}><path d="m24 24 19 19M45 45 29 61"/><circle cx="24" cy="24" r="11"/><circle cx="73" cy="73" r="12"/><path d="m43 43 21 21M63 27a13 13 0 0 1 17 17l-8-8-9 9-8-8a13 13 0 0 1 8-10Z" fill="${secondary}" stroke="none"/></g>`;
    case "tourist":
      return `<g ${transform} ${common}><circle cx="50" cy="50" r="25"/><path d="M50 8v16M50 76v16M8 50h16M76 50h16M21 21l11 11M68 68l11 11M79 21 68 32M32 68 21 79" stroke="${secondary}"/><path d="m50 33 7 17-7 17-7-17 7-17Z" fill="${color}" stroke="none"/></g>`;
  }
}

export const PRODUCTION_TEST_URL = "https://huaxue-test.pages.dev/";

export function getTestEntryUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_TEST_URL;
  const { hostname } = window.location;
  const isLocalDev =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local");
  if (isLocalDev) return PRODUCTION_TEST_URL;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

const SERIF_CANVAS_FONT =
  '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';
const MONO_CANVAS_FONT =
  'ui-monospace,"SF Mono",Menlo,Consolas,"Courier New",monospace';

export type PosterTextRun = {
  x: number;
  y: number;
  size: number;
  weight: number;
  fill: string;
  /** serif = 思源宋体（网页字体），mono = 等宽（系统字体） */
  family: "serif" | "mono";
  letterSpacing: number;
  text: string;
  anchor?: "middle" | "end";
};

export interface SharePosterSpec {
  /** 完整海报 SVG（含文字），用于矢量下载 */
  svg: string;
  /** 纯图形底图 SVG（不含文字），用于 PNG 合成 */
  baseSvg: string;
  textRuns: PosterTextRun[];
}

/**
 * 导出前确保海报用到的思源宋体切片已经就绪。
 * 文字最终由 canvas 在页面上下文里绘制，能复用页面 webfont；
 * 若某些字形切片尚未下载，document.fonts.load 会按需补齐。
 */
async function ensurePosterFonts(runs: PosterTextRun[]): Promise<void> {
  const fonts = document.fonts;
  if (!fonts?.load) return;
  const sample = runs
    .filter((run) => run.family === "serif")
    .map((run) => run.text)
    .join("\n")
    .slice(0, 4000);
  const jobs: Promise<unknown>[] = [];
  for (const weight of [400, 700]) {
    jobs.push(
      fonts.load(`${weight} 30px "Noto Serif SC"`, sample).catch(() => null),
    );
  }
  await Promise.all(jobs);
}

/**
 * 把文字 run 逐个字符绘制到 canvas（文档上下文，webfont 可用）。
 * 逐字符绘制是为了跨浏览器稳定复刻 SVG 的 letter-spacing（可为负值）。
 */
function drawPosterTextRuns(context: CanvasRenderingContext2D, runs: PosterTextRun[]): void {
  context.textBaseline = "alphabetic";
  for (const run of runs) {
    if (!run.text) continue;
    context.font = `${run.weight} ${run.size}px ${run.family === "serif" ? SERIF_CANVAS_FONT : MONO_CANVAS_FONT}`;
    context.fillStyle = run.fill;

    let total = 0;
    for (const char of run.text) {
      total += context.measureText(char).width;
    }
    if (run.text.length > 1) {
      total += run.letterSpacing * (run.text.length - 1);
    }

    let cursor = run.x;
    if (run.anchor === "end") cursor -= total;
    else if (run.anchor === "middle") cursor -= total / 2;

    for (const char of run.text) {
      context.fillText(char, cursor, run.y);
      cursor += context.measureText(char).width + run.letterSpacing;
    }
  }
}

/** 将海报渲染为 1080×1440 的 PNG Blob（用于移动端分享/保存）。 */
export async function svgToPngBlob(spec: SharePosterSpec): Promise<Blob> {
  await ensurePosterFonts(spec.textRuns);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建画布上下文");

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(spec.baseSvg)}`;
  await image.decode();
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawPosterTextRuns(context, spec.textRuns);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("PNG 导出失败");
  return blob;
}

/**
 * 当前环境能否用 Web Share 直接发送 PNG 文件。
 * 支持：iOS Safari 15+、安卓 Chrome 等；不支持：微信/QQ 等内置 WebView、老浏览器。
 * 用 1×1 探针文件探测而非只看 API 存在，避免部分 WebView 假暴露 canShare。
 */
export function canShareImageFile(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined") return false;
  if (!navigator.share || typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Blob(["probe"])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** 用系统分享直接发送海报 PNG 文件（调用前先确认 canShareImageFile() 为 true）。 */
export async function sharePosterPngFile(pngBlob: Blob, fileName: string): Promise<void> {
  const file = new File([pngBlob], `${fileName}.png`, { type: "image/png" });
  await navigator.share({ files: [file] });
}

export function normalizeShareName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10);
}

/**
 * heartschemes 文案以 heartEyeBalance 短语开头（如"拉完了。特别说明…"）。
 * 当展示区已有大字余额时，小字应去掉重复的首句，只保留后面的解释。
 */
export function balanceFollowUp(value: string): string {
  const index = value.indexOf("。");
  return index >= 0 ? value.slice(index + 1).trim() : value;
}

function posterTextTag(run: PosterTextRun): string {
  const attrs = [
    `x="${run.x}"`,
    `y="${run.y}"`,
    `fill="${run.fill}"`,
    `font-family="${run.family === "serif" ? SERIF_STACK : "monospace"}"`,
    `font-size="${run.size}"`,
  ];
  if (run.weight !== 400) attrs.push(`font-weight="${run.weight}"`);
  if (run.letterSpacing !== 0) attrs.push(`letter-spacing="${run.letterSpacing}"`);
  if (run.anchor) attrs.push(`text-anchor="${run.anchor}"`);
  return `<text ${attrs.join(" ")}>${escapeXml(run.text)}</text>`;
}

/**
 * 生成海报的全部素材：完整 SVG（矢量下载用）与纯图形底图 SVG +
 * 文字 run（PNG 导出用，文字由 canvas 用页面 webfont 绘制）。
 * 形状与文字按同一份 1080×1440 坐标生成，避免两份设计漂移。
 */
export function buildSharePosterSpec(
  archetype: Archetype,
  content: PersonalityResultContent,
  displayScores: DimensionVector,
  testUrl: string,
  displayName = "",
  leastLike?: Archetype,
): SharePosterSpec {
  const palette = SYMBOL_PALETTES[archetype.visualSymbol];
  const cleanName = normalizeShareName(displayName);
  const personalizedLabel = cleanName ? `${cleanName}，你的花少人格是` : "你的花少人格是";
  const matrix = createQrMatrix(testUrl);
  const qrTotal = 156;
  const qrModule = qrTotal / (matrix.size + 8);
  const topDimensions = getTopDimensionIds(displayScores);
  const quoteLines = wrapText(`“${content.recall.quote}”`, 16).slice(0, 2);
  const noteLines = wrapText(content.recall.note, 38).slice(0, quoteLines.length > 1 ? 1 : 2);
  const heartCopyLines = wrapText(balanceFollowUp(content.heartschemes), 20).slice(0, 2);
  const qrX = 824;
  const qrY = 1134;
  const noteStart = 664 + quoteLines.length * 38 + 26;
  const qrModules = qrPath(matrix, qrX + qrModule * 4, qrY + qrModule * 4, qrModule);

  const svgParts: string[] = [];
  const baseParts: string[] = [];
  const textRuns: PosterTextRun[] = [];

  const shape = (markup: string) => {
    svgParts.push(markup);
    baseParts.push(markup);
  };
  const text = (run: PosterTextRun) => {
    svgParts.push(posterTextTag(run));
    textRuns.push(run);
  };

  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">`,
  );
  baseParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">`,
  );
  shape(
    `<defs><pattern id="paper-grid" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M72 0H0V72" fill="none" stroke="${palette.accent}" stroke-opacity=".035"/></pattern></defs>`,
  );
  shape(`<rect width="1080" height="1440" fill="${PAPER}"/>`);
  shape(`<rect width="1080" height="1440" fill="url(#paper-grid)"/>`);
  shape(`<rect x="36" y="36" width="1008" height="1368" fill="none" stroke="${palette.accent}" stroke-width="2" stroke-opacity=".55"/>`);
  shape(`<path d="M72 132H1008" stroke="${INK}" stroke-opacity=".22"/>`);

  text({ x: 72, y: 92, size: 18, weight: 400, fill: INK, family: "mono", letterSpacing: 3, text: "花少人格 / HUAXUE TEST" });
  text({ x: 1008, y: 92, size: 16, weight: 400, fill: MUTED, family: "mono", letterSpacing: 2, text: "FIELD FILE 02", anchor: "end" });
  text({ x: 72, y: 230, size: 17, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 4, text: `PERSONALITY ARCHIVE / ${archetype.englishName}` });
  text({ x: 72, y: 332, size: 45, weight: 700, fill: INK, family: "serif", letterSpacing: 5, text: personalizedLabel });
  text({ x: 72, y: 458, size: 102, weight: 700, fill: INK, family: "serif", letterSpacing: -5, text: archetype.personName });
  text({ x: 72, y: 522, size: 38, weight: 700, fill: palette.secondary, family: "serif", letterSpacing: 0, text: archetype.title });

  shape(symbolSvg(archetype.visualSymbol, palette.accent, palette.secondary, 870, 250, 1.32));
  shape(`<rect x="72" y="566" width="936" height="252" fill="${palette.wash}" stroke="${palette.accent}" stroke-opacity=".26"/>`);
  text({ x: 102, y: 606, size: 15, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 3, text: "名场面 / ORIGINAL LINE" });
  quoteLines.forEach((line, index) => {
    text({ x: 102, y: 664 + index * 38, size: 36, weight: 700, fill: INK, family: "serif", letterSpacing: 0, text: line });
  });
  noteLines.forEach((line, index) => {
    text({ x: 102, y: noteStart + index * 26, size: 14, weight: 400, fill: MUTED, family: "serif", letterSpacing: 0, text: line });
  });
  text({ x: 72, y: 874, size: 15, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 3, text: "TOP 02 / 两个最突出维度" });

  topDimensions.forEach((dimension, index) => {
    const definition = DIMENSIONS[dimension];
    const score = displayScores[dimension];
    const x = index === 0 ? 72 : 548;
    const barWidth = 340;
    text({ x, y: 922, size: 16, weight: 400, fill: MUTED, family: "mono", letterSpacing: 2, text: definition.displayName });
    text({ x: x + 410, y: 922, size: 24, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 0, text: String(score), anchor: "end" });
    shape(`<rect x="${x}" y="944" width="${barWidth}" height="10" fill="${PAPER_DEEP}"/>`);
    shape(`<rect x="${x}" y="944" width="${Math.max(8, barWidth * score / 100)}" height="10" fill="${palette.secondary}"/>`);
    text({ x, y: 980, size: 14, weight: 400, fill: MUTED, family: "serif", letterSpacing: 0, text: score >= 50 ? definition.highLabel : definition.lowLabel });
  });

  shape(`<path d="M72 1030H1008" stroke="${INK}" stroke-opacity=".22"/>`);
  text({ x: 72, y: 1078, size: 15, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 3, text: "心眼子余额 / HEART-EYE BALANCE" });
  text({ x: 72, y: 1156, size: 58, weight: 700, fill: INK, family: "serif", letterSpacing: 0, text: content.heartEyeBalance });
  heartCopyLines.forEach((line, index) => {
    text({ x: 72, y: 1204 + index * 30, size: 20, weight: 400, fill: MUTED, family: "serif", letterSpacing: 0, text: line });
  });
  if (leastLike) {
    text({ x: 72, y: 1278, size: 15, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 2, text: `你的绝缘人格：${leastLike.personName}` });
  }
  shape(`<rect x="798" y="1086" width="210" height="252" fill="${PAPER_DEEP}" stroke="${INK}" stroke-opacity=".18"/>`);
  shape(`<rect x="${qrX}" y="${qrY}" width="${qrTotal}" height="${qrTotal}" fill="${PAPER}"/>`);
  shape(`<path d="${qrModules}" fill="${INK}" shape-rendering="crispEdges"/>`);
  text({ x: 903, y: 1316, size: 13, weight: 400, fill: INK, family: "mono", letterSpacing: 1, text: "扫码领取你的花学人格", anchor: "middle" });
  shape(`<path d="M72 1362H1008" stroke="${palette.accent}" stroke-opacity=".55"/>`);
  text({ x: 72, y: 1388, size: 13, weight: 400, fill: MUTED, family: "mono", letterSpacing: 2, text: "花学考古档案" });
  text({ x: 1008, y: 1388, size: 13, weight: 400, fill: palette.accent, family: "mono", letterSpacing: 0, text: archetype.englishName, anchor: "end" });

  svgParts.push("</svg>");
  baseParts.push("</svg>");
  return { svg: svgParts.join(""), baseSvg: baseParts.join(""), textRuns };
}

export function buildSharePosterSvg(
  archetype: Archetype,
  content: PersonalityResultContent,
  displayScores: DimensionVector,
  testUrl: string,
  displayName = "",
  leastLike?: Archetype,
): string {
  return buildSharePosterSpec(archetype, content, displayScores, testUrl, displayName, leastLike).svg;
}

/**
 * 结果页“复制花学配文”用的完整文本：内容主体来自 data/results.ts 的
 * shareCopy（v2.6 新增，七型各一条），此处只拼邀请句与测试链接，
 * 不维护任何逐型文案副本。
 */
export function buildShareCopy(
  content: PersonalityResultContent,
  testUrl: string,
): string {
  const body = content.shareCopy.trim();
  if (!body) return "";
  return `${body}\n\n你也来测测你是哪种花学人格：${testUrl}`;
}

