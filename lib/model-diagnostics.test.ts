import { describe, expect, it } from "vitest";
import { DIMENSION_ORDER } from "../data/dimensions";
import type { ArchetypeId } from "../data/types";
import {
  BASELINE_V31,
  buildReport,
  formatReport,
  getNearestQuestionTable,
  listGaps,
} from "./model-diagnostics";

const ARCHETYPE_IDS = Object.keys(BASELINE_V31.randomPrimaryShares) as ArchetypeId[];

const DIAGNOSE = process.env.DIAGNOSE === "1";
const STRICT = DIAGNOSE && process.env.DIAGNOSE_STRICT === "1";

const report = buildReport();

describe("model diagnostics（数据完整性回归）", () => {
  it("题库结构完整：24 题 × 4 选项、六维均有覆盖", () => {
    expect(report.questionCount).toBe(24);
    expect(report.optionCount).toBe(96);
    for (const dimension of DIMENSION_ORDER) {
      expect(report.dimensionCoverage[dimension]).toBeGreaterThan(0);
    }
  });

  it("G1：七型自洽路径全部回到自身（硬门槛）", () => {
    for (const archetypeId of ARCHETYPE_IDS) {
      expect(report.selfPaths[archetypeId].primary).toBe(archetypeId);
      expect(report.selfPaths[archetypeId].margin).toBeGreaterThan(0);
    }
  });

  it("基线与 v3.1 快照一致（内容改动需人工更新快照）", () => {
    expect(report.twinQuestionIds.length).toBe(BASELINE_V31.twinQuestionCount);
    for (const dimension of DIMENSION_ORDER) {
      expect(report.dimensionCoverage[dimension]).toBe(
        BASELINE_V31.dimensionCoverage[dimension],
      );
    }
    for (const archetypeId of ARCHETYPE_IDS) {
      expect(report.selfPaths[archetypeId].margin).toBeCloseTo(
        BASELINE_V31.selfPathMargins[archetypeId],
        3,
      );
      expect(report.random.primary[archetypeId]).toBeCloseTo(
        BASELINE_V31.randomPrimaryShares[archetypeId],
        3,
      );
    }
    expect(report.random.bestWorstRatio).toBeCloseTo(
      BASELINE_V31.bestWorstRatio,
      2,
    );
  });

  it("MC 结果确定性：同 seed 两次跑分一致", () => {
    const again = buildReport();
    for (const archetypeId of ARCHETYPE_IDS) {
      expect(again.random.primary[archetypeId]).toBe(report.random.primary[archetypeId]);
    }
  });
});

describe.skipIf(!DIAGNOSE)("model diagnostics（体检报告，npm run diagnose）", () => {
  it("打印体检报告", () => {
    console.log("\n" + formatReport(report));
    console.log("\n—— 每道题的选项最近人格分叉 ——");
    console.log(getNearestQuestionTable(report));
    console.log("");
  });

  it.skipIf(!STRICT)("严格模式：目标门槛 G2–G6 全部达标（npm run diagnose:strict）", () => {
    const gaps = listGaps(report);
    const summary = gaps.failed.map((gap) => `[${gap.key}] ${gap.message}`).join("\n");
    expect(summary).toBe("");
  });
});
