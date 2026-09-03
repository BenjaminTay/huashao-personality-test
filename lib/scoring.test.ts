import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { DIMENSION_ORDER } from "../data/dimensions";
import { QUESTIONS, QUESTION_SET_VERSION } from "../data/questions";
import {
  calculateDimensionScores,
  calculateResult,
  matchArchetypes,
  validateQuestionSet,
} from "./scoring";
import type { AnswerMap } from "../types";

const ALL_A_ANSWERS: AnswerMap = Object.fromEntries(
  QUESTIONS.map((question) => [question.id, "A"]),
) as AnswerMap;

describe("Flower Studies scoring v2.0", () => {
  it("keeps the frozen content shape intact", () => {
    const validation = validateQuestionSet();
    expect(validation.errors).toEqual([]);
    expect(QUESTION_SET_VERSION).toBe("2.4");
    expect(validation.questionCount).toBe(24);
    expect(validation.optionCount).toBe(96);
    expect(Object.values(ARCHETYPES)).toHaveLength(7);
  });

  it("calculates six display dimensions separately from profile matching", () => {
    const scores = calculateDimensionScores(ALL_A_ANSWERS);
    expect(scores.isComplete).toBe(true);
    expect(Object.keys(scores.display)).toEqual(["R", "S", "B", "D", "G", "I"]);
    for (const value of Object.values(scores.display)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic and exposes primary, secondary and least-like types", () => {
    const first = calculateResult(ALL_A_ANSWERS);
    const second = calculateResult(ALL_A_ANSWERS);
    expect(second).toEqual(first);
    expect(first.primary).not.toBe(first.secondary);
    expect(first.primary).not.toBe(first.leastLike);
    expect(first.evidence).toHaveLength(3);
  });

  it("keeps the Q17 relationship choices behaviorally distinct", () => {
    const question = QUESTIONS.find((candidate) => candidate.id === 17);
    expect(question).toBeDefined();
    expect(new Set(question?.options.map((option) => option.text)).size).toBe(4);
    expect(question?.options.map((option) => option.scores.R)).toEqual([5, 3, 4, 1]);
    expect(question?.options.map((option) => option.scores.B)).toEqual([1, 5, 4, 4]);
  });

  it("only uses selected answers when generating evidence", () => {
    const answers: AnswerMap = { ...ALL_A_ANSWERS, 17: "D" };
    const result = calculateResult(answers);
    for (const evidence of result.evidence) {
      expect(answers[evidence.questionId]).toBe(evidence.optionId);
    }
  });

  it("passes the seven-archetype internal consistency check", () => {
    const coverage = Object.fromEntries(
      DIMENSION_ORDER.map((dimension) => [
        dimension,
        QUESTIONS.reduce(
          (sum, question) =>
            sum +
            (question.dimensions.includes(dimension)
              ? question.weight ?? 1
              : 0),
          0,
        ),
      ]),
    );

    for (const archetype of Object.values(ARCHETYPES)) {
      const theoreticalAnswers = Object.fromEntries(
        QUESTIONS.map((question) => {
          const option = question.options.reduce((best, candidate) => {
            const candidateDistance = question.dimensions.reduce(
              (sum, dimension) => {
                const delta =
                  (candidate.scores[dimension] ?? 3) -
                  archetype.coordinates[dimension];
                return sum + (delta * delta) / coverage[dimension];
              },
              0,
            );
            const bestDistance = question.dimensions.reduce(
              (sum, dimension) => {
                const delta =
                  (best.scores[dimension] ?? 3) -
                  archetype.coordinates[dimension];
                return sum + (delta * delta) / coverage[dimension];
              },
              0,
            );
            return candidateDistance < bestDistance ? candidate : best;
          });
          return [question.id, option.id];
        }),
      );

      expect(matchArchetypes(theoreticalAnswers).primary).toBe(archetype.id);
    }
  });

  it("rejects incomplete formal submissions", () => {
    expect(() => matchArchetypes({ 1: "A" })).toThrow("完成全部题目");
  });
});
