#!/usr/bin/env node
/**
 * 拉取 GoatCounter 的 complete-* 事件计数，生成 data/population-stats.ts 快照。
 *
 * 需要环境变量：
 *   GOATCOUNTER_SITE       形如 https://your-code.goatcounter.com
 *                          （兼容带 /count 后缀的埋点地址）
 *   GOATCOUNTER_API_TOKEN  账户页面创建的只读 API token
 *   GOATCOUNTER_SINCE      统计起始日期 YYYY-MM-DD（默认 2026-09-01）
 *
 * 仅使用官方 JSON API：GET /api/v0/stats/hits?path_by_name=true&include_paths=...
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = (process.env.GOATCOUNTER_SITE ?? "")
  .replace(/\/+$/, "")
  .replace(/\/count$/, "");
const TOKEN = process.env.GOATCOUNTER_API_TOKEN ?? "";
const SINCE = process.env.GOATCOUNTER_SINCE ?? "2026-09-01";

const ARCHETYPE_IDS = ["mao", "xu", "ning", "zheng", "chen", "jing", "yang"];
const EVENT_PATHS = ARCHETYPE_IDS.map((id) => `complete-${id}`);

function fail(message) {
  console.error(`sync-population: ${message}`);
  process.exit(1);
}

if (!SITE || !TOKEN) {
  fail("缺少 GOATCOUNTER_SITE 或 GOATCOUNTER_API_TOKEN 环境变量");
}

const sinceIso = `${SINCE}T00:00:00Z`;
const query = new URLSearchParams({
  path_by_name: "true",
  include_paths: EVENT_PATHS.join(","),
  limit: "100",
  start: sinceIso,
});

const url = `${SITE}/api/v0/stats/hits?${query.toString()}`;
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
  fail(`API 请求失败（${response.status}）：${detail}`);
}

const data = await response.json();
const countsByPath = new Map(
  (data.hits ?? []).filter((hit) => hit.event).map((hit) => [hit.path, hit.count ?? 0]),
);

const completions = Object.fromEntries(
  ARCHETYPE_IDS.map((id) => [id, countsByPath.get(`complete-${id}`) ?? 0]),
);
const total = Object.values(completions).reduce((sum, count) => sum + count, 0);

const generatedAt = new Date().toISOString();
const content = `import type { ArchetypeId } from "./types";

export const POPULATION_SNAPSHOT_SCHEMA_VERSION = "1";

export interface PopulationSnapshot {
  generatedAt: string | null;
  since: string;
  completions: Record<ArchetypeId, number>;
}

export const POPULATION_SNAPSHOT: PopulationSnapshot = {
  generatedAt: "${generatedAt}",
  since: "${SINCE}",
  completions: { ${ARCHETYPE_IDS.map((id) => `${id}: ${completions[id]}`).join(", ")} },
};
`;

const outputFile = fileURLToPath(
  new URL("../data/population-stats.ts", import.meta.url),
);
writeFileSync(outputFile, content);

console.log(
  `sync-population: 已更新 ${outputFile}（总计 ${total} 人次，时间戳 ${generatedAt}）`,
);
