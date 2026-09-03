import {
  ARCHETYPES,
  type Archetype,
  type ArchetypeId,
} from "../data/archetypes";
import {
  DIMENSION_ORDER,
  type Dimension,
} from "../data/dimensions";
import {
  QUESTIONS,
  type OptionId,
  type Question,
} from "../data/questions";
import type {
  AnswerMap,
  ComputedResult,
  DimensionScores,
  EvidenceItem,
  MatchResult,
  QuestionSetValidation,
} from "../types";

export const SCORING_VERSION = "2.0";
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
export const DISPLAY_SCORE_MIN = 0;
export const DISPLAY_SCORE_MAX = 100;
export const NEAR_TIE_THRESHOLD = 0.35;

type DimensionVector = Record<Dimension, number>;

interface EvaluatedProfile {
  id: ArchetypeId;
  rawContribution: number;
  calibratedScore: number;
  itemContributions: Record<number, number>;
}

interface RankedProfile {
  id: ArchetypeId;
  score: number;
}

function createDimensionVector(value = 0): DimensionVector {
  return {
    R: value,
    S: value,
    B: value,
    D: value,
    G: value,
    I: value,
  };
}

function questionWeight(question: Question): number {
  return question.weight ?? 1;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isOptionId(value: unknown): value is OptionId {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function getOption(question: Question, optionId: OptionId) {
  return question.options.find((option) => option.id === optionId);
}

function assertQuestionSet(questions: readonly Question[]): void {
  const validation = validateQuestionSet(questions);
  if (validation.errors.length > 0) {
    throw new Error("题库校验失败：" + validation.errors.join("；"));
  }
}

function assertAnswerValue(question: Question, answers: AnswerMap): OptionId | undefined {
  const value = answers[question.id];
  if (value === undefined) {
    return undefined;
  }
  if (!isOptionId(value) || !getOption(question, value)) {
    throw new Error("Q" + question.id + " 的答案不是合法选项：" + String(value));
  }
  return value;
}

function assertCompleteAnswers(
  answers: AnswerMap,
  questions: readonly Question[],
): void {
  const missing: number[] = [];
  for (const question of questions) {
    if (assertAnswerValue(question, answers) === undefined) {
      missing.push(question.id);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      "正式分类需要完成全部题目，缺少：" +
        missing.map((id) => "Q" + id).join(", "),
    );
  }
}

/**
 * 检查题目、选项、维度和评分是否满足开发基线。
 */
export function validateQuestionSet(
  questions: readonly Question[] = QUESTIONS,
): QuestionSetValidation {
  const errors: string[] = [];
  const ids = new Set<number>();
  const optionIds = new Set<string>();
  const dimensionCoverage = createDimensionVector();
  let optionCount = 0;

  for (const question of questions) {
    if (ids.has(question.id)) {
      errors.push("重复题目 ID Q" + question.id);
    }
    ids.add(question.id);

    if (question.dimensions.length !== 2) {
      errors.push("Q" + question.id + " 必须恰好测量两个维度");
    }
    if (question.weight !== undefined && question.weight <= 0) {
      errors.push("Q" + question.id + " 的权重必须大于 0");
    }

    for (const dimension of question.dimensions) {
      if (!DIMENSION_ORDER.includes(dimension)) {
        errors.push("Q" + question.id + " 使用了未知维度 " + dimension);
      } else {
        dimensionCoverage[dimension] += questionWeight(question);
      }
    }

    if (question.options.length !== 4) {
      errors.push("Q" + question.id + " 必须有 4 个选项");
    }

    for (const option of question.options) {
      optionCount += 1;
      const optionKey = question.id + ":" + option.id;
      if (optionIds.has(optionKey)) {
        errors.push("重复选项 " + optionKey);
      }
      optionIds.add(optionKey);

      const scoreKeys = Object.keys(option.scores) as Dimension[];
      if (scoreKeys.length !== 2) {
        errors.push("Q" + question.id + option.id + " 必须有两个维度评分");
      }
      for (const dimension of scoreKeys) {
        if (!question.dimensions.includes(dimension)) {
          errors.push(
            "Q" + question.id + option.id + " 的评分维度 " + dimension + " 不在题目维度内",
          );
        }
        const score = option.scores[dimension];
        if (
          typeof score !== "number" ||
          !Number.isFinite(score) ||
          score < SCORE_MIN ||
          score > SCORE_MAX
        ) {
          errors.push("Q" + question.id + option.id + " 的 " + dimension + " 分数必须在 1–5");
        }
      }
      for (const dimension of question.dimensions) {
        if (typeof option.scores[dimension] !== "number") {
          errors.push("Q" + question.id + option.id + " 缺少 " + dimension + " 评分");
        }
      }
    }
  }

  return {
    questionCount: questions.length,
    optionCount,
    dimensionCoverage,
    errors,
  };
}

/**
 * 六维展示分：逐维度做加权平均，原始位置 1–5 再映射为 0–100。
 *
 * allowPartial=true 适合答题过程中的临时面板；未观测维度会暂用中点 3/50，
 * 正式结果仍应使用默认的完整答题模式。
 */
export function calculateDimensionScores(
  answers: AnswerMap,
  questions: readonly Question[] = QUESTIONS,
  options: { allowPartial?: boolean } = {},
): DimensionScores {
  assertQuestionSet(questions);
  const allowPartial = options.allowPartial ?? false;
  const raw = createDimensionVector();
  const totalWeight = createDimensionVector();
  const observedQuestions = createDimensionVector();
  const missing: number[] = [];

  for (const question of questions) {
    const optionId = assertAnswerValue(question, answers);
    if (optionId === undefined) {
      missing.push(question.id);
      continue;
    }
    const option = getOption(question, optionId);
    if (!option) {
      throw new Error("Q" + question.id + " 缺少选项 " + optionId);
    }
    const weight = questionWeight(question);
    for (const dimension of question.dimensions) {
      raw[dimension] += (option.scores[dimension] ?? 3) * weight;
      totalWeight[dimension] += weight;
      observedQuestions[dimension] += 1;
    }
  }

  if (!allowPartial && missing.length > 0) {
    throw new Error(
      "六维正式分数需要完成全部题目，缺少：" +
        missing.map((id) => "Q" + id).join(", "),
    );
  }

  const rawScores = createDimensionVector();
  const display = createDimensionVector();
  for (const dimension of DIMENSION_ORDER) {
    rawScores[dimension] =
      totalWeight[dimension] > 0 ? raw[dimension] / totalWeight[dimension] : 3;
    if (totalWeight[dimension] === 0) {
      rawScores[dimension] = 3;
    }
    display[dimension] = Math.round(
      clamp(
        ((rawScores[dimension] - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100,
        DISPLAY_SCORE_MIN,
        DISPLAY_SCORE_MAX,
      ),
    );
  }

  return {
    raw: rawScores,
    display,
    observedQuestions,
    isComplete: missing.length === 0,
  };
}

function calculateDimensionBalanceWeights(
  questions: readonly Question[],
): DimensionVector {
  const coverage = createDimensionVector();
  for (const question of questions) {
    const weight = questionWeight(question);
    for (const dimension of question.dimensions) {
      coverage[dimension] += weight;
    }
  }

  const weights = createDimensionVector();
  for (const dimension of DIMENSION_ORDER) {
    weights[dimension] = coverage[dimension] > 0 ? 1 / coverage[dimension] : 0;
  }
  return weights;
}

function itemDistanceSquared(
  archetype: Archetype,
  question: Question,
  optionId: OptionId,
  balanceWeights: DimensionVector,
): number {
  const option = getOption(question, optionId);
  if (!option) {
    throw new Error("Q" + question.id + " 缺少选项 " + optionId);
  }
  return question.dimensions.reduce((sum, dimension) => {
    const observed = option.scores[dimension];
    if (typeof observed !== "number") {
      throw new Error("Q" + question.id + optionId + " 缺少 " + dimension + " 评分");
    }
    const delta = observed - archetype.coordinates[dimension];
    return sum + balanceWeights[dimension] * delta * delta;
  }, 0);
}

/**
 * 对一个人格计算 Item-Profile Matching 的题目贡献。
 *
 * 每题先用四个选项的平均距离做基线：
 *   contribution = questionWeight × (meanDistance - selectedDistance)
 *
 * 因此，某选项比该题平均选项更像该人格时贡献为正，更不像时贡献为负。
 * 再用均匀随机选项下的理论标准差做 z 校准，消除原型几何空间的天然偏置。
 */
function evaluateProfile(
  answers: AnswerMap,
  archetype: Archetype,
  questions: readonly Question[],
  balanceWeights: DimensionVector,
): EvaluatedProfile {
  let rawContribution = 0;
  let variance = 0;
  const itemContributions: Record<number, number> = {};

  for (const question of questions) {
    const selectedId = assertAnswerValue(question, answers);
    if (selectedId === undefined) {
      throw new Error("Q" + question.id + " 缺少答案");
    }
    const optionDistances = question.options.map((option) =>
      itemDistanceSquared(archetype, question, option.id, balanceWeights),
    );
    const meanDistance =
      optionDistances.reduce((sum, distance) => sum + distance, 0) /
      optionDistances.length;
    const selectedDistance = itemDistanceSquared(
      archetype,
      question,
      selectedId,
      balanceWeights,
    );
    const contribution = questionWeight(question) * (meanDistance - selectedDistance);
    rawContribution += contribution;
    itemContributions[question.id] = contribution;

    const randomContributions = optionDistances.map(
      (distance) => questionWeight(question) * (meanDistance - distance),
    );
    const itemVariance =
      randomContributions.reduce(
        (sum, randomContribution) => sum + randomContribution * randomContribution,
        0,
      ) / randomContributions.length;
    variance += itemVariance;
  }

  const sigma = Math.sqrt(variance);
  return {
    id: archetype.id,
    rawContribution,
    calibratedScore: sigma > 1e-9 ? rawContribution / sigma : 0,
    itemContributions,
  };
}

/**
 * 最终人格分类。注意：这是题目级校准匹配，不是旧的六维简单欧氏距离。
 */
export function matchArchetypes(
  answers: AnswerMap,
  questions: readonly Question[] = QUESTIONS,
  archetypes: Record<ArchetypeId, Archetype> = ARCHETYPES,
): MatchResult {
  assertQuestionSet(questions);
  assertCompleteAnswers(answers, questions);
  const balanceWeights = calculateDimensionBalanceWeights(questions);
  const ids = Object.keys(archetypes) as ArchetypeId[];
  if (ids.length < 3) {
    throw new Error("至少需要三个候选人格才能生成主型、副型和最不像");
  }

  const evaluated = ids.map((id) =>
    evaluateProfile(answers, archetypes[id], questions, balanceWeights),
  );
  const ranked: RankedProfile[] = evaluated
    .map((profile) => ({ id: profile.id, score: profile.calibratedScore }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const highest = ranked[0];
  const second = ranked[1];
  const lowest = ranked[ranked.length - 1];

  return {
    primary: highest.id,
    secondary: second.id,
    leastLike: lowest.id,
    calibratedScores: Object.fromEntries(
      ranked.map((profile) => [profile.id, round(profile.score)]),
    ) as Record<ArchetypeId, number>,
    rawContributions: Object.fromEntries(
      evaluated.map((profile) => [profile.id, round(profile.rawContribution)]),
    ) as Record<ArchetypeId, number>,
    margins: {
      primarySecondary: round(highest.score - second.score),
      secondaryLeastLike: round(second.score - lowest.score),
    },
    nearTie: highest.score - second.score <= NEAR_TIE_THRESHOLD,
  };
}

/**
 * 生成结果页“为什么是你”的证据。
 *
 * 排序同时考虑：对主型的正向贡献，以及相对副型的区分度。
 * 这样不会只挑一条“大家都可能选”的泛证据。
 */
export function generateEvidence(
  answers: AnswerMap,
  primary: ArchetypeId,
  secondary: ArchetypeId,
  questions: readonly Question[] = QUESTIONS,
  archetypes: Record<ArchetypeId, Archetype> = ARCHETYPES,
  limit = 3,
): EvidenceItem[] {
  assertQuestionSet(questions);
  assertCompleteAnswers(answers, questions);
  const balanceWeights = calculateDimensionBalanceWeights(questions);
  const primaryProfile = evaluateProfile(
    answers,
    archetypes[primary],
    questions,
    balanceWeights,
  );
  const secondaryProfile = evaluateProfile(
    answers,
    archetypes[secondary],
    questions,
    balanceWeights,
  );

  const candidates = questions.map((question) => {
    const optionId = assertAnswerValue(question, answers);
    if (!optionId) {
      throw new Error("Q" + question.id + " 缺少答案");
    }
    const option = getOption(question, optionId);
    if (!option) {
      throw new Error("Q" + question.id + " 缺少选项 " + optionId);
    }
    const primaryContribution = primaryProfile.itemContributions[question.id] ?? 0;
    const secondaryContribution = secondaryProfile.itemContributions[question.id] ?? 0;
    const contrastWithSecondary = primaryContribution - secondaryContribution;
    const evidenceRank =
      primaryContribution * 0.65 + contrastWithSecondary * 0.35;
    return {
      questionId: question.id,
      optionId,
      questionTitle: question.title,
      optionText: option.text,
      evidenceText: option.evidenceText,
      dimensions: question.dimensions,
      primaryContribution: round(primaryContribution),
      contrastWithSecondary: round(contrastWithSecondary),
      evidenceRank,
    };
  });

  candidates.sort(
    (a, b) =>
      b.evidenceRank - a.evidenceRank || a.questionId - b.questionId,
  );
  const positive = candidates.filter(
    (candidate) => candidate.primaryContribution > 0,
  );
  const selected = (positive.length >= limit ? positive : candidates).slice(
    0,
    Math.max(1, limit),
  );

  return selected.map(({ evidenceRank, ...evidence }) => {
    void evidenceRank;
    return evidence;
  });
}

/**
 * 一次性得到完整结果，供结果页直接消费。
 */
export function calculateResult(
  answers: AnswerMap,
  questions: readonly Question[] = QUESTIONS,
  archetypes: Record<ArchetypeId, Archetype> = ARCHETYPES,
): ComputedResult {
  const scores = calculateDimensionScores(answers, questions);
  const match = matchArchetypes(answers, questions, archetypes);
  const evidence = generateEvidence(
    answers,
    match.primary,
    match.secondary,
    questions,
    archetypes,
  );

  return {
    scores,
    primary: match.primary,
    secondary: match.secondary,
    leastLike: match.leastLike,
    calibratedScores: match.calibratedScores,
    evidence,
    nearTie: match.nearTie,
  };
}
