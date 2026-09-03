import { ARCHETYPES } from "../data/archetypes";
import { DIMENSION_ORDER } from "../data/dimensions";
import { QUESTIONS } from "../data/questions";
import type { ArchetypeId, DimensionId, OptionId } from "../data/types";
import {
  calculateResult,
  getQuestionContribution,
  validateQuestionSet,
} from "./scoring";

export const DIAGNOSTIC_REPORT_VERSION = "1.0";
export const MC_SEED = 20260903;
export const MC_SAMPLE_COUNT = 500_000;

const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];
const OPTION_IDS: OptionId[] = ["A", "B", "C", "D"];
const TIE_EPS = 1e-9;

/** Question Set v3.1 + Archetype Coordinates v2.1 基线快照（2026-09-03 合入）。
 *  孪生/槽位/出场指标统一使用“与分类器一致的题内校准贡献 argmax”口径。 */
export const BASELINE_V21 = {
  randomPrimaryShares: {
    mao: 0.0938,
    xu: 0.1495,
    ning: 0.1219,
    zheng: 0.1983,
    chen: 0.1049,
    jing: 0.1097,
    yang: 0.2219,
  } as Record<ArchetypeId, number>,
  bestWorstRatio: 2.37,
  twinQuestionCount: 2,
  chenQuestionPresence: 13,
  chenUniqueSlots: 13,
  dimensionCoverage: { R: 10, S: 8, B: 7, D: 8, G: 7, I: 8 } as Record<DimensionId, number>,
  selfPathMargins: {
    mao: 9.061,
    xu: 11.854,
    ning: 11.754,
    zheng: 13.941,
    chen: 7.821,
    jing: 9.022,
    yang: 15.053,
  } as Record<ArchetypeId, number>,
  weakestSelfPathMargin: 7.821,
};

/** 规划文档《人格分布优化》§4 的健康门槛（目标值，非均匀指标）。 */
export const TARGETS = {
  maxTwinQuestions: 4,
  dimensionCoverageMin: 6,
  dimensionCoverageMax: 9,
  minSelfPathMargin: 8,
  /** 参考指标，不硬性拦截。 */
  maxBestWorstRatio: 2.0,
} as const;

/** 每型的出场题数/唯一槽位下限（G3/G4）。全部 ≥12。
 *  注：v3.1 曾为 chen 设 ≥10 例外（其主场文本稀缺）；Archetype Coordinates v2.1
 *  合入后 chen 已达 13，例外解除。 */
export const MIN_QUESTION_PRESENCE: Record<ArchetypeId, number> = {
  mao: 12,
  xu: 12,
  ning: 12,
  zheng: 12,
  chen: 12,
  jing: 12,
  yang: 12,
};
export const MIN_UNIQUE_SLOTS: Record<ArchetypeId, number> = {
  ...MIN_QUESTION_PRESENCE,
};

/** G6 自洽领先分差下限。chen 按 7.5 验收（v2.1 提案 D5b：语义档位约束内局部上界 7.82）。 */
export const MIN_SELF_PATH_MARGIN: Record<ArchetypeId, number> = {
  mao: 8,
  xu: 8,
  ning: 8,
  zheng: 8,
  chen: 7.5,
  jing: 8,
  yang: 8,
};

export interface RandomBaselineStat {
  primary: Record<ArchetypeId, number>;
  top2: Record<ArchetypeId, number>;
  least: Record<ArchetypeId, number>;
  bestWorstRatio: number;
}

export interface SelfPathStat {
  primary: ArchetypeId;
  secondary: ArchetypeId;
  leastLike: ArchetypeId;
  margin: number;
}

export interface ModelDiagnosticsReport {
  version: string;
  generatedAt: string;
  seed: number;
  sampleCount: number;
  questionCount: number;
  optionCount: number;
  dimensionCoverage: Record<DimensionId, number>;
  /** 每道题：四个选项各自的贡献 argmax 人格（含并列）。 */
  nearestByQuestion: Record<string, ArchetypeId[][]>;
  /** 至少两个选项最贴近同一人格（含并列口径）的题目。 */
  twinQuestionIds: string[];
  /** 96 个槽位中“唯一最贴近”该人格的数量。 */
  uniqueOptionSlots: Record<ArchetypeId, number>;
  /** 该人格出现在多少道题的“最贴近名单”里。 */
  questionPresence: Record<ArchetypeId, number>;
  selfPaths: Record<ArchetypeId, SelfPathStat>;
  nearestNeighbors: Record<ArchetypeId, { id: ArchetypeId; distance: number; farthestId: ArchetypeId; farthestDistance: number }>;
  random: RandomBaselineStat;
}

export interface Gap {
  key: string;
  message: string;
  current: string;
  target: string;
}

/** 每题每个选项的最近人格（贡献最大者，并列保留全部，与分类器口径一致）。 */
export function nearestArchetypesForOption(
  questionId: string,
  optionId: OptionId,
): ArchetypeId[] {
  const contributions = ARCHETYPE_IDS.map((id) => ({
    id,
    value: getQuestionContribution(id, questionId, optionId),
  }));
  const best = Math.max(...contributions.map((c) => c.value));
  return contributions
    .filter((c) => Math.abs(c.value - best) <= TIE_EPS)
    .map((c) => c.id);
}

export function measureStructural(): Omit<
  ModelDiagnosticsReport,
  "random" | "seed" | "sampleCount" | "generatedAt" | "version"
> {
  const validation = validateQuestionSet();
  const dimensionCoverage = validation.dimensionCoverage;
  const optionCount = validation.optionCount;

  const nearestByQuestion: Record<string, ArchetypeId[][]> = {};
  const uniqueOptionSlots = Object.fromEntries(
    ARCHETYPE_IDS.map((id) => [id, 0]),
  ) as Record<ArchetypeId, number>;
  const questionPresence = Object.fromEntries(
    ARCHETYPE_IDS.map((id) => [id, 0]),
  ) as Record<ArchetypeId, number>;
  const twinQuestionIds: string[] = [];

  for (const question of QUESTIONS) {
    const perOption: ArchetypeId[][] = [];
    const claimed = Object.fromEntries(
      ARCHETYPE_IDS.map((id) => [id, 0]),
    ) as Record<ArchetypeId, number>;
    for (const optionId of OPTION_IDS) {
      const nearest = nearestArchetypesForOption(question.id, optionId);
      perOption.push(nearest);
      for (const archetypeId of nearest) claimed[archetypeId] += 1;
      if (nearest.length === 1) uniqueOptionSlots[nearest[0]] += 1;
    }
    nearestByQuestion[question.id] = perOption;
    const twins = ARCHETYPE_IDS.filter((id) => claimed[id] >= 2);
    if (twins.length > 0) twinQuestionIds.push(question.id);
    for (const archetypeId of ARCHETYPE_IDS) {
      if (claimed[archetypeId] > 0) questionPresence[archetypeId] += 1;
    }
  }

  const selfPaths = {} as Record<ArchetypeId, SelfPathStat>;
  for (const archetypeId of ARCHETYPE_IDS) {
    const answers: Record<string, OptionId> = {};
    for (const question of QUESTIONS) {
      let bestOption = OPTION_IDS[0];
      let bestValue = -Infinity;
      for (const optionId of OPTION_IDS) {
        const value = getQuestionContribution(archetypeId, question.id, optionId);
        if (value > bestValue) {
          bestValue = value;
          bestOption = optionId;
        }
      }
      answers[question.id] = bestOption;
    }
    const result = calculateResult(answers);
    selfPaths[archetypeId] = {
      primary: result.primaryType,
      secondary: result.secondaryType,
      leastLike: result.leastLikeType,
      margin: result.primarySecondaryDifference,
    };
  }

  const nearestNeighbors = {} as ModelDiagnosticsReport["nearestNeighbors"];
  for (const archetypeId of ARCHETYPE_IDS) {
    const coords = ARCHETYPES[archetypeId].coordinates;
    const distances = ARCHETYPE_IDS.filter((id) => id !== archetypeId).map(
      (otherId) => {
        const other = ARCHETYPES[otherId].coordinates;
        const distance = Math.sqrt(
          DIMENSION_ORDER.reduce(
            (sum, dimension) =>
              sum + (coords[dimension] - other[dimension]) ** 2,
            0,
          ),
        );
        return { id: otherId, distance };
      },
    );
    distances.sort((a, b) => a.distance - b.distance);
    nearestNeighbors[archetypeId] = {
      id: distances[0].id,
      distance: distances[0].distance,
      farthestId: distances[distances.length - 1].id,
      farthestDistance: distances[distances.length - 1].distance,
    };
  }

  return {
    questionCount: QUESTIONS.length,
    optionCount,
    dimensionCoverage,
    nearestByQuestion,
    twinQuestionIds,
    uniqueOptionSlots,
    questionPresence,
    selfPaths,
    nearestNeighbors,
  };
}

export function measureRandomBaseline(
  seed = MC_SEED,
  sampleCount = MC_SAMPLE_COUNT,
): RandomBaselineStat {
  const contrib = QUESTIONS.map((q) =>
    OPTION_IDS.map((o) =>
      ARCHETYPE_IDS.map((a) => getQuestionContribution(a, q.id, o)),
    ),
  );
  const primary = Object.fromEntries(
    ARCHETYPE_IDS.map((id) => [id, 0]),
  ) as Record<ArchetypeId, number>;
  const top2 = { ...primary };
  const least = { ...primary };
  const scores = new Array<number>(ARCHETYPE_IDS.length).fill(0);

  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  for (let n = 0; n < sampleCount; n++) {
    scores.fill(0);
    for (let q = 0; q < QUESTIONS.length; q++) {
      const optionIndex = Math.floor(rand() * OPTION_IDS.length);
      const row = contrib[q][optionIndex];
      for (let a = 0; a < ARCHETYPE_IDS.length; a++) scores[a] += row[a];
    }
    const ranked = [...ARCHETYPE_IDS].sort(
      (l, r) =>
        scores[ARCHETYPE_IDS.indexOf(r)] - scores[ARCHETYPE_IDS.indexOf(l)] ||
        l.localeCompare(r),
    );
    primary[ranked[0]] += 1;
    top2[ranked[0]] += 1;
    top2[ranked[1]] += 1;
    least[ranked[ARCHETYPE_IDS.length - 1]] += 1;
  }

  const toShare = (counts: Record<ArchetypeId, number>) =>
    Object.fromEntries(
      ARCHETYPE_IDS.map((id) => [id, counts[id] / sampleCount]),
    ) as Record<ArchetypeId, number>;

  const primaryShares = toShare(primary);
  const shares = Object.values(primaryShares);
  return {
    primary: primaryShares,
    top2: toShare(top2),
    least: toShare(least),
    bestWorstRatio: Math.max(...shares) / Math.min(...shares),
  };
}

export function buildReport(
  seed = MC_SEED,
  sampleCount = MC_SAMPLE_COUNT,
): ModelDiagnosticsReport {
  const structural = measureStructural();
  const random = measureRandomBaseline(seed, sampleCount);
  return {
    version: DIAGNOSTIC_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    seed,
    sampleCount,
    ...structural,
    random,
  };
}

/** 相对规划 §4 目标逐项检查，返回未达标与参考告警。 */
export function listGaps(report: ModelDiagnosticsReport): {
  failed: Gap[];
  soft: Gap[];
} {
  const failed: Gap[] = [];
  const soft: Gap[] = [];
  const push = (list: Gap[], key: string, current: string, target: string, message: string) =>
    list.push({ key, message, current, target });

  if (report.twinQuestionIds.length > TARGETS.maxTwinQuestions) {
    push(
      failed,
      "G2",
      `${report.twinQuestionIds.length}/24`,
      `≤ ${TARGETS.maxTwinQuestions}/24`,
      `孪生最近型题目：${report.twinQuestionIds.join(", ")}`,
    );
  }
  for (const dimension of DIMENSION_ORDER) {
    const count = report.dimensionCoverage[dimension];
    if (count < TARGETS.dimensionCoverageMin || count > TARGETS.dimensionCoverageMax) {
      push(
        failed,
        "G5",
        `${dimension}=${count}`,
        `${TARGETS.dimensionCoverageMin}–${TARGETS.dimensionCoverageMax} 题`,
        `维度 ${dimension} 覆盖超出目标区间`,
      );
    }
  }
  for (const archetypeId of ARCHETYPE_IDS) {
    const presenceFloor = MIN_QUESTION_PRESENCE[archetypeId];
    const presence = report.questionPresence[archetypeId];
    if (presence < presenceFloor) {
      push(
        failed,
        "G3",
        `${archetypeId}=${presence}/24`,
        `≥ ${presenceFloor}/24`,
        `人格 ${archetypeId} 出场不足`,
      );
    }
    const slotFloor = MIN_UNIQUE_SLOTS[archetypeId];
    const slots = report.uniqueOptionSlots[archetypeId];
    if (slots < slotFloor) {
      push(
        failed,
        "G4",
        `${archetypeId}=${slots}/96`,
        `≥ ${slotFloor}/96`,
        `人格 ${archetypeId} 唯一最贴近槽位不足`,
      );
    }
    const margin = report.selfPaths[archetypeId].margin;
    const marginFloor = MIN_SELF_PATH_MARGIN[archetypeId];
    if (margin < marginFloor) {
      push(
        failed,
        "G6",
        `${archetypeId}=${margin}`,
        `≥ ${marginFloor}`,
        `人格 ${archetypeId} 自洽路径领先分差过浅`,
      );
    }
  }
  const ratio = report.random.bestWorstRatio;
  if (ratio > TARGETS.maxBestWorstRatio) {
    push(
      soft,
      "G7",
      ratio.toFixed(2),
      `≤ ${TARGETS.maxBestWorstRatio}`,
      "随机基线最高/最低占比比（参考指标，不硬性拦截）",
    );
  }
  return { failed, soft };
}

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const pad = (value: string, width: number) => value.padEnd(width);

export function formatReport(report: ModelDiagnosticsReport): string {
  const baseline = BASELINE_V21;
  const lines: string[] = [];
  lines.push("======================================");
  lines.push("花学模型诊断报告");
  lines.push(`版本 v${report.version} · 题库 ${report.questionCount} 题 / ${report.optionCount} 选项`);
  lines.push(`生成于 ${report.generatedAt}（MC ${report.sampleCount} 次，seed ${report.seed}）`);
  lines.push("--------------------------------------");
  lines.push("六维维度覆盖（当前 vs 基线 v2.1）：");
  for (const dimension of DIMENSION_ORDER) {
    lines.push(
      `  ${pad(dimension, 2)} ${pad(String(report.dimensionCoverage[dimension]), 3)} 题  基线 ${baseline.dimensionCoverage[dimension]} 题  ` +
        `目标 ${TARGETS.dimensionCoverageMin}–${TARGETS.dimensionCoverageMax} 题`,
    );
  }
  lines.push(`孪生最近型题目：${report.twinQuestionIds.length}/24（目标 ≤ ${TARGETS.maxTwinQuestions}/24）`);
  lines.push(`  ${report.twinQuestionIds.length > 0 ? report.twinQuestionIds.join(", ") : "无"}`);
  lines.push("人格曝光（出场题数 / 唯一最贴近槽位）：");
  for (const archetypeId of ARCHETYPE_IDS) {
    const baselineHint =
      archetypeId === "chen"
        ? `  (基线 chen 出场 ${baseline.chenQuestionPresence}/24、槽位 ${baseline.chenUniqueSlots}/96)`
        : "";
    lines.push(
      `  ${pad(archetypeId, 6)} 出场 ${pad(String(report.questionPresence[archetypeId]), 3)}/24  ` +
        `槽位 ${pad(String(report.uniqueOptionSlots[archetypeId]), 3)}/96${baselineHint}`,
    );
  }
  lines.push("自洽路径（每型全程选最贴近自己的选项）：");
  for (const archetypeId of ARCHETYPE_IDS) {
    const stat = report.selfPaths[archetypeId];
    const ok = stat.primary === archetypeId ? "自洽" : `异常→${stat.primary}`;
    lines.push(
      `  ${pad(archetypeId, 6)} ${ok} · 领先分差 ${pad(stat.margin.toFixed(3), 8)} · 副型 ${stat.secondary} · 最不像 ${stat.leastLike}`,
    );
  }
  lines.push("最近邻（六维坐标距离）：");
  for (const archetypeId of ARCHETYPE_IDS) {
    const neighbor = report.nearestNeighbors[archetypeId];
    lines.push(
      `  ${pad(archetypeId, 6)} 最近 ${pad(neighbor.id, 5)} ${neighbor.distance.toFixed(2)} · 最远 ${pad(neighbor.farthestId, 5)} ${neighbor.farthestDistance.toFixed(2)}`,
    );
  }
  lines.push("随机作答基线 MC：");
  for (const archetypeId of ARCHETYPE_IDS) {
    const current = report.random.primary[archetypeId];
    const previous = baseline.randomPrimaryShares[archetypeId];
    const delta = current - previous;
    lines.push(
      `  ${pad(archetypeId, 6)} 当前 ${pad(percent(current), 7)}  基线 ${pad(percent(previous), 7)}  ` +
        `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(2)}pp`,
    );
  }
  lines.push(
    `  最高/最低 = ${report.random.bestWorstRatio.toFixed(2)}×（基线 ${baseline.bestWorstRatio}×，参考目标 ≤ ${TARGETS.maxBestWorstRatio}×）`,
  );
  const gaps = listGaps(report);
  lines.push("--------------------------------------");
  if (gaps.failed.length === 0 && gaps.soft.length === 0) {
    lines.push("目标门槛：全部达标");
  } else {
    if (gaps.failed.length > 0) {
      lines.push(`未达标（${gaps.failed.length}）：`);
      for (const gap of gaps.failed) {
        lines.push(`  [${gap.key}] ${gap.message} 当前 ${gap.current} / 目标 ${gap.target}`);
      }
    }
    if (gaps.soft.length > 0) {
      lines.push("参考告警（不硬性拦截）：");
      for (const gap of gaps.soft) {
        lines.push(`  [${gap.key}] ${gap.message} 当前 ${gap.current} / 目标 ${gap.target}`);
      }
    }
  }
  lines.push("======================================");
  return lines.join("\n");
}

export function getNearestQuestionTable(report: ModelDiagnosticsReport): string {
  const rows = QUESTIONS.map((q) => {
    const perOption = report.nearestByQuestion[q.id]
      .map((types, index) => `${OPTION_IDS[index]}→${types.join("+") || "?"}`)
      .join("  ");
    return `${q.id} ${perOption}`;
  });
  return rows.join("\n");
}
