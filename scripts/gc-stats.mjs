#!/usr/bin/env node
/**
 * 本地查看 GoatCounter 统计报表（只读，不修改任何项目文件、不依赖部署快照）。
 *
 * 使用：
 *   npm run stats                # 默认从 2026-09-01 起
 *   npm run stats -- --since=2026-09-01
 *
 * 配置：脚本会按顺序读取环境变量 → .env.local（.gitignore 已忽略），需要：
 *   GOATCOUNTER_SITE       形如 https://your-code.goatcounter.com（兼容 /count 后缀）
 *   GOATCOUNTER_API_TOKEN  登录 GoatCounter 后在 右上角菜单 → API 创建的只读 token
 *
 * 口径说明（与本仓库埋点一致）：
 *   - 事件以 no_session 上报，每次触发计 1 人次；
 *   - 页面浏览按 GoatCounter 的访问者去重（同一浏览器当日多次刷新只计 1）；
 *   - 所以“开始/完成/分享”等漏斗用事件人次计算，与页面访问量不直接可比。
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const argv = process.argv.slice(2);
const sinceArg = argv.find((a) => a.startsWith("--since="));
const SINCE = sinceArg ? sinceArg.slice("--since=".length) : "2026-09-01";
const END = argv.find((a) => a.startsWith("--end="))?.slice("--end=".length) ?? "";

const ARCHETYPE_IDS = ["mao", "xu", "ning", "zheng", "chen", "jing", "yang"];
const ARCHETYPE_NAMES = {
  mao: "毛阿敏",
  xu: "许晴",
  ning: "宁静",
  zheng: "郑爽",
  chen: "陈意涵",
  jing: "井柏然",
  yang: "杨洋",
};

function fail(message) {
  console.error(`gc-stats: ${message}`);
  process.exit(1);
}

const envFile = path.join(ROOT_DIR, ".env.local");
const localEnv = new Map();
if (existsSync(envFile)) {
  for (const rawLine of readFileSync(envFile, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    localEnv.set(key, value);
  }
}
function env(name) {
  return process.env[name] ?? localEnv.get(name) ?? "";
}

const SITE = env("GOATCOUNTER_SITE").replace(/\/+$/, "").replace(/\/count$/, "");
const TOKEN = env("GOATCOUNTER_API_TOKEN");

if (!SITE) fail("缺少 GOATCOUNTER_SITE（环境变量或 .env.local）");
if (!TOKEN) {
  fail(
    "缺少 GOATCOUNTER_API_TOKEN。\n" +
      "  复制 .env.example 为 .env.local，填入 token：\n" +
      "    cp .env.example .env.local\n" +
      "  token 在 https://benjaminlei.goatcounter.com 右上角菜单 → API 创建（只读即可）。",
  );
}

async function fetchJson(pathname, params) {
  const url = new URL(`${SITE}/api/v0${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await response.json());
    } catch {
      detail = await response.text();
    }
    fail(`API ${pathname} 请求失败（${response.status}）：${detail}`);
  }
  return response.json();
}

const pct = (part, total) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "-";

function pad(text, width) {
  const visible = String(text);
  const count = [...visible].length;
  return visible + " ".repeat(Math.max(0, width - count));
}

const [hitsData, totalData] = await Promise.all([
  fetchJson("/stats/hits", {
    path_by_name: "true",
    limit: "200",
    start: SINCE,
    end: END,
  }),
  fetchJson("/stats/total", { start: SINCE, end: END }),
]);

const pathHits = hitsData.hits ?? [];
const pageHits = pathHits.filter((hit) => !hit.event);
const eventHits = pathHits.filter((hit) => hit.event);

const byPath = (path) =>
  eventHits.find((hit) => hit.path === path)?.count ?? 0;

const startCount = byPath("start-test");
const completeCounts = Object.fromEntries(
  ARCHETYPE_IDS.map((id) => [id, byPath(`complete-${id}`)]),
);
const completeTotal = Object.values(completeCounts).reduce(
  (sum, n) => sum + n,
  0,
);
const shareDownload = byPath("share-download");
const shareImage = byPath("share-image");
const shareTotal = shareDownload + shareImage;

const now = new Date();
const fmtDate = (d) =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const fmtNumber = (n) => n.toLocaleString("zh-CN");
const fmtTime = (d) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0",
  )}`;

console.log("花学测试 · GoatCounter 本地报表（只读直查，非部署快照）");
console.log("──────────────────────────────────────────────────────");
console.log(`站点      ${SITE.replace(/^https?:\/\//, "")}`);
console.log(
  `窗口      ${SINCE}${END ? ` ~ ${END}` : ` ~ ${fmtDate(now)}`}`,
);
console.log(`生成于    ${fmtDate(now)} ${fmtTime(now)}（本地时间）`);
console.log("");

console.log("一、总量（访问者口径，见文件头注释）");
console.log(`  全部访问者          ${fmtNumber(totalData.total ?? 0)}`);
console.log(`  其中事件访问者      ${fmtNumber(totalData.total_events ?? 0)}`);
console.log("");

console.log("二、页面访问（非事件路径）");
if (pageHits.length === 0) {
  console.log("  （无）");
} else {
  for (const hit of pageHits.slice(0, 10)) {
    console.log(`  ${pad(hit.path, 32)}${pad(fmtNumber(hit.count ?? 0), 8)}访问者`);
  }
}
console.log("");

console.log("三、事件漏斗（每次触发 = 1 人次）");
console.log(
  `  ${pad("start-test 开始测试", 22)}${pad(fmtNumber(startCount), 8)}100.0%`,
);
console.log(
  `  ${pad("complete-* 完成鉴定", 22)}${pad(fmtNumber(completeTotal), 8)}${pct(
    completeTotal,
    startCount,
  )}`,
);
console.log(
  `  ${pad("share-* 下载/分享海报", 22)}${pad(fmtNumber(shareTotal), 8)}${pct(
    shareTotal,
    completeTotal,
  )}（完成者中）`,
);
console.log("");

console.log("四、七型完成分布（人次）");
const sortedTypes = ARCHETYPE_IDS.map((id) => ({ id, count: completeCounts[id] }))
  .sort((a, b) => b.count - a.count);
const maxCount = Math.max(1, ...sortedTypes.map((t) => t.count));
for (const { id, count } of sortedTypes) {
  const bar = "█".repeat(Math.max(1, Math.round((count / maxCount) * 14)));
  console.log(
    `  ${pad(ARCHETYPE_NAMES[id], 6)}${pad(id, 6)}${pad(fmtNumber(count), 6)}${bar} ${pct(
      count,
      completeTotal,
    )}`,
  );
}
if (completeTotal === 0) {
  console.log("  （窗口内暂无完成人次）");
}
console.log("");

const daily = (totalData.stats ?? [])
  .filter((stat) => stat?.day)
  .map((stat) => ({ day: stat.day, count: stat.daily ?? 0 }));
if (daily.length > 0) {
  console.log("五、每日访问者趋势（全部路径含事件）");
  for (const { day, count } of daily) {
    console.log(`  ${day}    ${fmtNumber(count)}`);
  }
  console.log("");
}

console.log("六、备注");
console.log("  页面快照 data/population-stats.ts 可能滞后；本报表直连 GoatCounter，所见即最新。");
console.log("  跨日对比请用同一 --since/--end 窗口，GoatCounter 对过去的计数不会追溯修正。");
