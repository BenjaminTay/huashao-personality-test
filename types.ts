export type {
  ArchetypeId,
  DimensionId,
  DimensionVector,
  EvidenceItem,
  OptionId,
  QuizAnswers,
  QuizResult,
} from "./data/types";

export type AnswerMap = import("./data/types").QuizAnswers;
export type CompleteAnswerMap = Record<string, import("./data/types").OptionId>;
export type ComputedResult = import("./data/types").QuizResult;
