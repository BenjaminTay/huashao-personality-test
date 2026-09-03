import { QUESTIONS, QUESTION_SET_VERSION } from "../../data/questions";
import { POPULATION_SNAPSHOT } from "../../data/population-stats";
import { getQuestionContribution } from "../../lib/scoring";
import type { ArchetypeId, OptionId } from "../../data/types";
import type { QuizAnswers as AnswerMap } from "../../data/types";

export type Screen = "home" | "quiz" | "act" | "loading" | "reveal" | "result";

export const STORAGE_KEY = `huaxue-test-session-v${QUESTION_SET_VERSION}`;
export const LEGACY_STORAGE_KEY = `flower-studies-archive-session-v${QUESTION_SET_VERSION}`;

export const LOADING_LINES = [
  "正在整理你的 24 个选择……",
  "正在比较你在不同场合的反应……",
  "正在查看你对关系和边界的处理方式……",
  "正在生成你的花少2人格档案……",
  "马上就好……",
];

export const HOME_SUBTITLES = [
  "看看你在旅行团里通常是什么位置。",
  "测测你遇到复杂关系时会怎么处理。",
  "一份根据你的选择生成的花少2娱乐人格档案。",
];

export const SAMPLE_PERCENT_MIN = 50;

export function formatSampleCount(value: number): string {
  return value.toLocaleString("zh-CN");
}

export function formatSampleDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export function getSampleTotal(): number {
  return Object.values(POPULATION_SNAPSHOT.completions).reduce(
    (sum, count) => sum + count,
    0,
  );
}

export function getSamplePercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function isOptionId(value: unknown): value is OptionId {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

export function sanitizeAnswers(value: unknown): AnswerMap {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const clean: AnswerMap = {};
  for (const question of QUESTIONS) {
    const optionId = source[String(question.id)];
    if (
      isOptionId(optionId) &&
      question.options.some((option) => option.id === optionId)
    ) {
      clean[question.id] = optionId;
    }
  }
  return clean;
}

export function readSession(): {
  answers: AnswerMap;
  currentIndex: number;
  screen: Screen;
} | null {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const answers = sanitizeAnswers(parsed.answers);
    const currentIndex =
      typeof parsed.currentIndex === "number"
        ? Math.min(Math.max(Math.floor(parsed.currentIndex), 0), QUESTIONS.length - 1)
        : 0;
    const validScreens: Screen[] = [
      "home",
      "quiz",
      "act",
      "loading",
      "reveal",
      "result",
    ];
    const screen = validScreens.includes(parsed.screen as Screen)
      ? (parsed.screen as Screen)
      : "quiz";
    return { answers, currentIndex, screen };
  } catch {
    return null;
  }
}

export function formatQuestionNumber(value: string | number): string {
  return String(value).replace(/^Q/, "").padStart(2, "0");
}

/**
 * 本地验收用：为指定人格生成"全程选最贴近该型选项"的 24 题答案路径，
 * 与模型诊断里的自洽路径口径一致（主型必然回到自身）。不手写 mock 答案。
 */
export function buildTypeAnswers(type: ArchetypeId): AnswerMap {
  const answers: AnswerMap = {};
  for (const question of QUESTIONS) {
    let bestOption = question.options[0].id;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of question.options) {
      const score = getQuestionContribution(type, question.id, option.id);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option.id;
      }
    }
    answers[question.id] = bestOption;
  }
  return answers;
}
