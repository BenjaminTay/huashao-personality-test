import { ARCHETYPES } from "../data/archetypes";
import { DIMENSION_ORDER } from "../data/dimensions";
import { QUESTION_SCORING_V3 } from "../data/question-scoring.v3";
import { QUESTIONS, type Question } from "../data/questions";
import type {
  ArchetypeId,
  DimensionId,
  DimensionVector,
  EvidenceItem,
  OptionId,
  QuizAnswers,
  QuizResult,
} from "../data/types";

export const SCORING_VERSION = "3.0";
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
export const DISPLAY_SCORE_MIN = 0;
export const DISPLAY_SCORE_MAX = 100;

const OPTION_IDS: OptionId[] = ["A", "B", "C", "D"];
const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationSd(values: number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isOptionId(value: unknown): value is OptionId {
  return OPTION_IDS.includes(value as OptionId);
}

function createDimensionVector(value = 0): DimensionVector {
  return { R: value, S: value, B: value, D: value, G: value, I: value };
}

function assertQuestionSet(questions: readonly Question[]): void {
  const validation = validateQuestionSet(questions);
  if (validation.errors.length > 0) {
    throw new Error("题库校验失败：" + validation.errors.join("；"));
  }
}

function assertAnswersBelongToQuestionSet(
  answers: QuizAnswers,
  questions: readonly Question[],
): void {
  const knownIds = new Set(questions.map((question) => question.id));
  for (const [questionId, optionId] of Object.entries(answers)) {
    if (!knownIds.has(questionId)) {
      throw new Error(`答案包含未知题目：${questionId}`);
    }
    if (!isOptionId(optionId)) {
      throw new Error(`${questionId} 的答案不是合法选项：${String(optionId)}`);
    }
  }
}

function assertCompleteAnswers(
  answers: QuizAnswers,
  questions: readonly Question[],
): void {
  assertAnswersBelongToQuestionSet(answers, questions);
  const missing = questions
    .filter((question) => answers[question.id] === undefined)
    .map((question) => question.id);
  if (missing.length > 0) {
    throw new Error(`正式分类需要完成全部题目，缺少：${missing.join(", ")}`);
  }
}

function selectedOptionId(
  answers: QuizAnswers,
  question: Question,
): OptionId {
  const optionId = answers[question.id];
  if (!isOptionId(optionId)) {
    throw new Error(`${question.id} 的答案不是合法选项：${String(optionId)}`);
  }
  if (!question.options.some((option) => option.id === optionId)) {
    throw new Error(`${question.id} 缺少选项 ${optionId}`);
  }
  return optionId;
}

/** 校验 V3 题目、24×4 评分矩阵与六维覆盖。 */
export function validateQuestionSet(
  questions: readonly Question[] = QUESTIONS,
): { questionCount: number; optionCount: number; dimensionCoverage: DimensionVector; errors: string[] } {
  const errors: string[] = [];
  const dimensionCoverage = createDimensionVector();
  const questionIds = new Set<string>();
  let optionCount = 0;

  for (const question of questions) {
    if (questionIds.has(question.id)) errors.push(`重复题目 ID ${question.id}`);
    questionIds.add(question.id);

    const scoring = QUESTION_SCORING_V3[question.id];
    if (!scoring) {
      errors.push(`${question.id} 缺少 V3 评分矩阵`);
      continue;
    }
    if (question.dimensions.length !== 2) errors.push(`${question.id} 必须恰好测量两个维度`);
    if (question.dimensions.join(",") !== scoring.dimensions.join(",")) {
      errors.push(`${question.id} 的题目维度与 V3 矩阵不一致`);
    }
    for (const dimension of question.dimensions) dimensionCoverage[dimension] += 1;

    if (question.options.length !== 4) errors.push(`${question.id} 必须有 4 个选项`);
    const optionIds = new Set<OptionId>();
    for (const option of question.options) {
      optionCount += 1;
      if (optionIds.has(option.id)) errors.push(`重复选项 ${question.id}/${option.id}`);
      optionIds.add(option.id);
      for (const dimension of question.dimensions) {
        const score = scoring.options[option.id][dimension];
        if (typeof score !== "number" || score < SCORE_MIN || score > SCORE_MAX) {
          errors.push(`${question.id}/${option.id} 的 ${dimension} 分数必须在 1–5`);
        }
      }
    }
    if (OPTION_IDS.some((optionId) => !optionIds.has(optionId))) {
      errors.push(`${question.id} 必须包含 A/B/C/D 四个选项`);
    }
  }

  for (const dimension of DIMENSION_ORDER) {
    if (dimensionCoverage[dimension] === 0) errors.push(`${dimension} 没有题目覆盖`);
  }
  if (questions.length !== 24) errors.push(`题目数量应为 24，当前为 ${questions.length}`);

  return { questionCount: questions.length, optionCount, dimensionCoverage, errors };
}

function squaredDistanceForQuestion(
  archetypeId: ArchetypeId,
  questionId: string,
  optionId: OptionId,
): number {
  const question = QUESTION_SCORING_V3[questionId];
  const archetype = ARCHETYPES[archetypeId];
  if (!question) throw new Error(`不存在题目 ${questionId}`);
  if (!archetype) throw new Error(`不存在人格 ${archetypeId}`);
  const optionVector = question.options[optionId];
  return question.dimensions.reduce((sum, dimension) => {
    const optionValue = optionVector[dimension];
    if (optionValue == null) throw new Error(`缺少 ${dimension} 评分：${questionId}/${optionId}`);
    return sum + (optionValue - archetype.coordinates[dimension]) ** 2;
  }, 0);
}

/** Calibrated Item-Profile Matching v3：每题四个选项先题内标准化，再跨题等权累加。 */
export function getQuestionContribution(
  archetypeId: ArchetypeId,
  questionId: string,
  optionId: OptionId,
): number {
  if (!isOptionId(optionId)) throw new Error(`${questionId} 的答案不是合法选项：${String(optionId)}`);
  const distances = OPTION_IDS.map((option) => squaredDistanceForQuestion(archetypeId, questionId, option));
  const standardDeviation = populationSd(distances);
  if (standardDeviation < 1e-9) return 0;
  return (mean(distances) - squaredDistanceForQuestion(archetypeId, questionId, optionId)) / standardDeviation;
}

export function calculateMatchScores(
  answers: QuizAnswers,
  questions: readonly Question[] = QUESTIONS,
): Record<ArchetypeId, number> {
  assertQuestionSet(questions);
  assertCompleteAnswers(answers, questions);
  const scores = Object.fromEntries(ARCHETYPE_IDS.map((id) => [id, 0])) as Record<ArchetypeId, number>;
  for (const question of questions) {
    const optionId = selectedOptionId(answers, question);
    for (const archetypeId of ARCHETYPE_IDS) {
      scores[archetypeId] += getQuestionContribution(archetypeId, question.id, optionId);
    }
  }
  return scores;
}

/** 六维展示分：每题先减去本题四个选项的中心，再按维度聚合。 */
export function calculateSixDimensionProfile(
  answers: QuizAnswers,
  questions: readonly Question[] = QUESTIONS,
): DimensionVector {
  assertQuestionSet(questions);
  assertAnswersBelongToQuestionSet(answers, questions);
  const centeredByDimension: Record<DimensionId, number[]> = { R: [], S: [], B: [], D: [], G: [], I: [] };
  const positiveCaps: Record<DimensionId, number[]> = { R: [], S: [], B: [], D: [], G: [], I: [] };
  const negativeCaps: Record<DimensionId, number[]> = { R: [], S: [], B: [], D: [], G: [], I: [] };

  for (const question of questions) {
    const optionId = answers[question.id];
    if (!isOptionId(optionId)) continue;
    const scoring = QUESTION_SCORING_V3[question.id];
    for (const dimension of scoring.dimensions) {
      const values = OPTION_IDS.map((option) => {
        const value = scoring.options[option][dimension];
        if (value == null) throw new Error(`缺少 ${dimension} 评分：${question.id}/${option}`);
        return value;
      });
      const center = mean(values);
      const centered = values.map((value) => value - center);
      centeredByDimension[dimension].push(scoring.options[optionId][dimension]! - center);
      positiveCaps[dimension].push(Math.max(...centered));
      negativeCaps[dimension].push(Math.abs(Math.min(...centered)));
    }
  }

  const result = createDimensionVector(50);
  for (const dimension of DIMENSION_ORDER) {
    if (centeredByDimension[dimension].length === 0) continue;
    const raw = mean(centeredByDimension[dimension]);
    const positiveCap = mean(positiveCaps[dimension]) || 1;
    const negativeCap = mean(negativeCaps[dimension]) || 1;
    const normalized = raw >= 0
      ? 50 + 50 * Math.min(raw / positiveCap, 1)
      : 50 - 50 * Math.min(Math.abs(raw) / negativeCap, 1);
    result[dimension] = Math.round(normalized * 10) / 10;
  }
  return result;
}

export function calculateEvidence(
  answers: QuizAnswers,
  primaryType: ArchetypeId,
  secondaryType: ArchetypeId,
  questions: readonly Question[] = QUESTIONS,
  limit = 3,
): EvidenceItem[] {
  assertQuestionSet(questions);
  assertCompleteAnswers(answers, questions);
  return questions
    .map((question) => {
      const optionId = selectedOptionId(answers, question);
      const primaryContribution = getQuestionContribution(primaryType, question.id, optionId);
      const secondaryContribution = getQuestionContribution(secondaryType, question.id, optionId);
      return {
        questionId: question.id,
        optionId,
        primaryContribution,
        secondaryContribution,
        evidenceScore: primaryContribution - secondaryContribution,
        questionTitle: question.title,
        optionText: question.options.find((option) => option.id === optionId)!.text,
      };
    })
    .sort((left, right) => right.evidenceScore - left.evidenceScore || left.questionId.localeCompare(right.questionId))
    .slice(0, Math.max(1, limit));
}

export function scoreQuiz(
  answers: QuizAnswers,
  questions: readonly Question[] = QUESTIONS,
): QuizResult {
  assertQuestionSet(questions);
  assertCompleteAnswers(answers, questions);
  const matchScores = calculateMatchScores(answers, questions);
  const ranking = [...ARCHETYPE_IDS].sort((left, right) => matchScores[right] - matchScores[left] || left.localeCompare(right));
  const primaryType = ranking[0];
  const secondaryType = ranking[1];
  const leastLikeType = ranking[ranking.length - 1];
  return {
    primaryType,
    secondaryType,
    leastLikeType,
    matchScores,
    sixDimensionProfile: calculateSixDimensionProfile(answers, questions),
    topEvidenceQuestions: calculateEvidence(answers, primaryType, secondaryType, questions),
    primarySecondaryDifference: round(matchScores[primaryType] - matchScores[secondaryType]),
  };
}

export const calculateResult = scoreQuiz;
