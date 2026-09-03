"use client";

import { useMemo } from "react";
import QRCode from "qrcode";
import type { Archetype } from "../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../data/dimensions";
import type { PersonalityResultContent } from "../data/results";
import type { DimensionId, DimensionVector, VisualSymbol } from "../data/types";

const PAPER = "#f6f0e5";
const PAPER_DEEP = "#e8dece";
const INK = "#20251f";
const MUTED = "#73766d";

const SYMBOL_PALETTES: Record<VisualSymbol, { accent: string; secondary: string; wash: string }> = {
  map: { accent: "#b64c3e", secondary: "#4c7180", wash: "#e8e0d2" },
  truth: { accent: "#87392f", secondary: "#778c68", wash: "#eee1d8" },
  boundary: { accent: "#557465", secondary: "#b64c3e", wash: "#e4e7dc" },
  "error-log": { accent: "#a34439", secondary: "#4c7180", wash: "#eee0d9" },
  exit: { accent: "#9a6b38", secondary: "#778c68", wash: "#eee5d1" },
  repair: { accent: "#3f6978", secondary: "#b64c3e", wash: "#dfe9e8" },
  tourist: { accent: "#a85b3f", secondary: "#778c68", wash: "#eee7d5" },
};

interface SharePosterProps {
  archetype: Archetype;
  content: PersonalityResultContent;
  displayScores: DimensionVector;
  testUrl: string;
  displayName?: string;
}

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

function previewSymbol(symbol: VisualSymbol): React.ReactNode {
  return (
    <span className={`share-poster-symbol share-poster-symbol--${symbol}`} aria-hidden="true">
      <span className="symbol-core" />
      <span className="symbol-trace" />
    </span>
  );
}

function QrCode({ value }: { value: string }) {
  const matrix = useMemo(() => createQrMatrix(value), [value]);
  const modules = matrix.modules.map((row) => row.map((cell) => (cell ? "1" : "0")).join("")).join("");
  return (
    <svg className="share-poster-qr" viewBox={`0 0 ${matrix.size + 8} ${matrix.size + 8}`} role="img" aria-label="扫码打开花学测试">
      <title>扫码打开花学测试</title>
      <rect width={matrix.size + 8} height={matrix.size + 8} fill={PAPER} />
      <path d={qrPath(matrix, 4, 4, 1)} fill={INK} shapeRendering="crispEdges" data-modules={modules} />
    </svg>
  );
}

export const PRODUCTION_TEST_URL = "https://benjamintay.github.io/huashao-personality-test/";

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

/** 将海报 SVG 渲染为 1080×1440 的 PNG Blob（用于移动端分享/保存）。 */
export async function svgToPngBlob(svg: string): Promise<Blob> {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建画布上下文");
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("PNG 导出失败");
  return blob;
}

/** 移动端主路径：优先 Web Share 直接分享 PNG；不可用时在新标签打开 PNG 供长按保存。 */
export async function sharePosterAsImage(svg: string, fileName: string): Promise<void> {
  const pngBlob = await svgToPngBlob(svg);
  const file = new File([pngBlob], `${fileName}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const pngUrl = URL.createObjectURL(pngBlob);
  window.open(pngUrl, "_blank");
}

export function normalizeShareName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10);
}

export function buildSharePosterSvg(
  archetype: Archetype,
  content: PersonalityResultContent,
  displayScores: DimensionVector,
  testUrl: string,
  displayName = "",
): string {
  const palette = SYMBOL_PALETTES[archetype.visualSymbol];
  const cleanName = normalizeShareName(displayName);
  const personalizedLabel = cleanName ? `${cleanName}，你的花少人格是` : "你的花少人格是";
  const matrix = createQrMatrix(testUrl);
  const qrTotal = 184;
  const qrModule = qrTotal / (matrix.size + 8);
  const topDimensions = getTopDimensionIds(displayScores);
  const punchLines = wrapText(content.punchline, 18).slice(0, 4);
  const heartLines = wrapText(content.heartschemes, 23).slice(0, 2);
  const qrX = 814;
  const qrY = 1124;
  const dimensionMarkup = topDimensions.map((dimension, index) => {
    const definition = DIMENSIONS[dimension];
    const score = displayScores[dimension];
    const x = index === 0 ? 72 : 548;
    const barWidth = 340;
    return `<g>
      <text x="${x}" y="922" fill="${MUTED}" font-family="monospace" font-size="16" letter-spacing="2">${dimension} / ${escapeXml(definition.displayName)}</text>
      <text x="${x + 410}" y="922" fill="${palette.accent}" font-family="monospace" font-size="24" text-anchor="end">${score}</text>
      <rect x="${x}" y="944" width="${barWidth}" height="10" fill="${PAPER_DEEP}"/>
      <rect x="${x}" y="944" width="${Math.max(8, barWidth * score / 100)}" height="10" fill="${palette.secondary}"/>
      <text x="${x}" y="980" fill="${MUTED}" font-family="serif" font-size="14">${escapeXml(definition.lowLabel)}</text>
    </g>`;
  }).join("");
  const qrModules = qrPath(matrix, qrX + qrModule * 4, qrY + qrModule * 4, qrModule);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
    <defs>
      <pattern id="paper-grid" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M72 0H0V72" fill="none" stroke="${palette.accent}" stroke-opacity=".035"/>
      </pattern>
    </defs>
    <rect width="1080" height="1440" fill="${PAPER}"/>
    <rect width="1080" height="1440" fill="url(#paper-grid)"/>
    <rect x="36" y="36" width="1008" height="1368" fill="none" stroke="${palette.accent}" stroke-width="2" stroke-opacity=".55"/>
    <path d="M72 132H1008" stroke="${INK}" stroke-opacity=".22"/>
    <text x="72" y="92" fill="${INK}" font-family="monospace" font-size="18" letter-spacing="3">花少人格 / HUAXUE TEST</text>
    <text x="1008" y="92" fill="${MUTED}" font-family="monospace" font-size="16" text-anchor="end" letter-spacing="2">FIELD FILE 02</text>
    <text x="72" y="230" fill="${palette.accent}" font-family="monospace" font-size="17" letter-spacing="4">PERSONALITY ARCHIVE / ${escapeXml(archetype.englishName)}</text>
    <text x="72" y="332" fill="${INK}" font-family="serif" font-size="45" font-weight="700" letter-spacing="5">${escapeXml(personalizedLabel)}</text>
    <text x="72" y="458" fill="${INK}" font-family="serif" font-size="102" font-weight="700" letter-spacing="-5">${escapeXml(archetype.personName)}</text>
    <text x="72" y="522" fill="${palette.secondary}" font-family="serif" font-size="38" font-weight="700">${escapeXml(archetype.title)}</text>
    ${symbolSvg(archetype.visualSymbol, palette.accent, palette.secondary, 870, 250, 1.32)}
    <rect x="72" y="576" width="936" height="222" fill="${palette.wash}" stroke="${palette.accent}" stroke-opacity=".26"/>
    <text x="102" y="620" fill="${palette.accent}" font-family="monospace" font-size="15" letter-spacing="3">一句话暴击 / DIRECT HIT</text>
    ${punchLines.map((line, index) => `<text x="102" y="${680 + index * 39}" fill="${INK}" font-family="serif" font-size="36" font-weight="700">${escapeXml(line)}</text>`).join("")}
    <text x="72" y="874" fill="${palette.accent}" font-family="monospace" font-size="15" letter-spacing="3">TOP 02 / 两个最突出维度</text>
    ${dimensionMarkup}
    <path d="M72 1030H1008" stroke="${INK}" stroke-opacity=".22"/>
    <text x="72" y="1080" fill="${palette.accent}" font-family="monospace" font-size="15" letter-spacing="3">心眼子余额 / HEART-EYE BALANCE</text>
    <text x="72" y="1146" fill="${INK}" font-family="serif" font-size="43" font-weight="700">${escapeXml(content.heartEyeBalance)}</text>
    ${heartLines.map((line, index) => `<text x="72" y="${1190 + index * 27}" fill="${MUTED}" font-family="serif" font-size="18">${escapeXml(line)}</text>`).join("")}
    <rect x="790" y="1080" width="218" height="260" fill="${PAPER_DEEP}" stroke="${INK}" stroke-opacity=".18"/>
    <rect x="806" y="1116" width="184" height="184" fill="${PAPER}"/>
    <path d="${qrModules}" fill="${INK}" shape-rendering="crispEdges"/>
    <text x="899" y="1324" fill="${INK}" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="1">扫码测测你是谁</text>
    <path d="M72 1362H1008" stroke="${palette.accent}" stroke-opacity=".55"/>
    <text x="72" y="1388" fill="${MUTED}" font-family="monospace" font-size="13" letter-spacing="2">纯娱乐原型 · 3:4 SHARE POSTER</text>
    <text x="1008" y="1388" fill="${palette.accent}" font-family="monospace" font-size="13" text-anchor="end">${escapeXml(archetype.visualSymbol.toUpperCase())} / 24Q</text>
  </svg>`;
}

export function SharePoster({ archetype, content, displayScores, testUrl, displayName = "" }: SharePosterProps) {
  const palette = SYMBOL_PALETTES[archetype.visualSymbol];
  const topDimensions = getTopDimensionIds(displayScores);
  const cleanName = normalizeShareName(displayName);
  const personalizedLabel = cleanName ? `${cleanName}，你的花少人格是` : "你的花少人格是";
  return (
    <div
      className={`share-poster share-poster--${archetype.visualSymbol}`}
      style={{ "--poster-accent": palette.accent, "--poster-secondary": palette.secondary, "--poster-wash": palette.wash } as React.CSSProperties}
      role="img"
      aria-label={`${archetype.personName} 3:4 花少人格分享海报`}
    >
      <div className="share-poster-grain" aria-hidden="true" />
      <header className="share-poster-header">
        <span>花少人格 / HUAXUE TEST</span>
        <span>FIELD FILE 02</span>
      </header>
      <div className="share-poster-rule" aria-hidden="true" />
      <div className="share-poster-hero">
        <div>
          <p className="share-poster-kicker">PERSONALITY ARCHIVE / {archetype.englishName}</p>
          <p className="share-poster-label">{personalizedLabel}</p>
          <h3>{archetype.personName}</h3>
          <p className="share-poster-title">{archetype.title}</p>
        </div>
        {previewSymbol(archetype.visualSymbol)}
      </div>
      <section className="share-poster-punch">
        <p className="share-poster-section-label">一句话暴击 / DIRECT HIT</p>
        <p>{content.punchline}</p>
      </section>
      <section className="share-poster-dimensions" aria-label="两个最突出维度">
        <p className="share-poster-section-label">TOP 02 / 两个最突出维度</p>
        <div className="share-poster-dimension-grid">
          {topDimensions.map((dimension) => {
            const definition = DIMENSIONS[dimension];
            const score = displayScores[dimension];
            return (
              <div className="share-poster-dimension" key={dimension}>
                <div><span>{dimension} / {definition.displayName}</span><strong>{score}</strong></div>
                <span className="share-poster-mini-bar"><i style={{ width: `${score}%` }} /></span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="share-poster-bottom">
        <section className="share-poster-heart">
          <p className="share-poster-section-label">心眼子余额 / HEART-EYE</p>
          <strong>{content.heartEyeBalance}</strong>
          <p>{content.heartschemes}</p>
        </section>
        <section className="share-poster-qr-wrap">
          <QrCode value={testUrl} />
          <p>扫码测测你是谁</p>
        </section>
      </div>
      <footer className="share-poster-footer">
        <span>纯娱乐原型 · 3:4 SHARE POSTER</span>
        <span>{archetype.visualSymbol.toUpperCase()} / 24Q</span>
      </footer>
    </div>
  );
}
