import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../data/dimensions";
import { QUESTION_SCORING_V3 } from "../data/question-scoring.v3";
import { QUESTIONS, QUESTION_SET_VERSION } from "../data/questions";
import type { ArchetypeId, QuizAnswers } from "../data/types";
import {
  calculateResult,
  calculateSixDimensionProfile,
  getQuestionContribution,
  scoreQuiz,
  validateQuestionSet,
} from "./scoring";

const ALL_A_ANSWERS: QuizAnswers = Object.fromEntries(
  QUESTIONS.map((question) => [question.id, "A"]),
);

describe("Calibrated Item-Profile Matching v3", () => {
  it("uses the complete V3 content shape", () => {
    const validation = validateQuestionSet();
    expect(validation.errors).toEqual([]);
    expect(QUESTION_SET_VERSION).toBe("3.2");
    expect(validation.questionCount).toBe(24);
    expect(validation.optionCount).toBe(96);
    expect(Object.values(ARCHETYPES)).toHaveLength(7);
    expect(Object.keys(DIMENSIONS)).toEqual(["R", "S", "B", "D", "G", "I"]);
    expect(DIMENSIONS.B.internalName).toBe("人际边界");
    expect(DIMENSIONS.B.displayName).toBe("边界感");
  });

  it("keeps the V3 question set and matrix aligned", () => {
    expect(QUESTIONS.map((question) => question.id)).toEqual(
      Array.from({ length: 24 }, (_, index) => `Q${String(index + 1).padStart(2, "0")}`),
    );
    expect(Object.keys(QUESTION_SCORING_V3)).toHaveLength(24);
    for (const question of QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.options.map((option) => option.id)).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("centers selected item scores before aggregating the six dimensions", () => {
    const profile = calculateSixDimensionProfile(ALL_A_ANSWERS);
    expect(Object.keys(profile)).toEqual([...DIMENSION_ORDER]);
    for (const value of Object.values(profile)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }

    const oldUncenteredAverage = Object.fromEntries(
      DIMENSION_ORDER.map((dimension) => {
        const values = QUESTIONS.filter((question) => question.dimensions.includes(dimension))
          .map((question) => question.options[0].scores[dimension] ?? 3);
        return [dimension, Math.round((values.reduce((sum, value) => sum + value, 0) / values.length - 1) * 25)];
      }),
    );
    expect(profile).not.toEqual(oldUncenteredAverage);
  });

  it("returns the required V3 result fields deterministically", () => {
    const first = calculateResult(ALL_A_ANSWERS);
    const second = calculateResult(ALL_A_ANSWERS);
    expect(second).toEqual(first);
    expect(first.primaryType).not.toBe(first.secondaryType);
    expect(first.primaryType).not.toBe(first.leastLikeType);
    expect(first.topEvidenceQuestions).toHaveLength(3);
    expect(typeof first.primarySecondaryDifference).toBe("number");
    expect(Object.keys(first.sixDimensionProfile)).toEqual([...DIMENSION_ORDER]);
  });

  it("calculates evidence as primary contribution minus secondary contribution", () => {
    const answers: QuizAnswers = { ...ALL_A_ANSWERS, Q17: "D" };
    const result = scoreQuiz(answers);
    for (const evidence of result.topEvidenceQuestions) {
      expect(answers[evidence.questionId]).toBe(evidence.optionId);
      expect(evidence.evidenceScore).toBeCloseTo(
        evidence.primaryContribution - evidence.secondaryContribution,
        2,
      );
    }
  });

  it("uses the selected option path when checking theoretical archetype consistency", () => {
    for (const [archetypeId, archetype] of Object.entries(ARCHETYPES) as [ArchetypeId, (typeof ARCHETYPES)[ArchetypeId]][]) {
      const theoreticalAnswers: QuizAnswers = Object.fromEntries(
        QUESTIONS.map((question) => {
          const matrix = QUESTION_SCORING_V3[question.id];
          const option = ["A", "B", "C", "D"] as const;
          const best = option.reduce((bestOption, optionId) => {
            const distance = matrix.dimensions.reduce((sum, dimension) => {
              const delta = matrix.options[optionId][dimension]! - archetype.coordinates[dimension];
              return sum + delta * delta;
            }, 0);
            const bestDistance = matrix.dimensions.reduce((sum, dimension) => {
              const delta = matrix.options[bestOption][dimension]! - archetype.coordinates[dimension];
              return sum + delta * delta;
            }, 0);
            return distance < bestDistance ? optionId : bestOption;
          });
          return [question.id, best];
        }),
      );
      expect(scoreQuiz(theoreticalAnswers).primaryType).toBe(archetypeId);
    }
  });

  it("rejects incomplete, unknown, and invalid answers", () => {
    expect(() => scoreQuiz({ Q01: "A" })).toThrow("完成全部题目");
    expect(() => scoreQuiz({ ...ALL_A_ANSWERS, Q99: "A" })).toThrow("未知题目");
    expect(() => scoreQuiz({ ...ALL_A_ANSWERS, Q01: "X" as never })).toThrow("合法选项");
  });

  it("exposes calibrated question contributions without a six-dimension classifier", () => {
    expect(getQuestionContribution("mao", "Q01", "A")).toBeTypeOf("number");
    expect(getQuestionContribution("mao", "Q01", "D")).not.toBe(
      getQuestionContribution("mao", "Q01", "A"),
    );
  });
});
