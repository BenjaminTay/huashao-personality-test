import type { ArchetypeId } from "./data/archetypes";
import type { Dimension } from "./data/dimensions";
import type { OptionId, Question } from "./data/questions";

export type AnswerMap = Partial<Record<number, OptionId>>;

export type CompleteAnswerMap = Record<number, OptionId>;

export type DimensionVector = Record<Dimension, number>;

export interface DimensionScores {
  raw: DimensionVector;
  display: DimensionVector;
  observedQuestions: Record<Dimension, number>;
  isComplete: boolean;
}

export interface EvidenceItem {
  questionId: number;
  optionId: OptionId;
  questionTitle: string;
  optionText: string;
  evidenceText: string;
  dimensions: [Dimension, Dimension];
  primaryContribution: number;
  contrastWithSecondary: number;
}

export interface MatchResult {
  primary: ArchetypeId;
  secondary: ArchetypeId;
  leastLike: ArchetypeId;
  calibratedScores: Record<ArchetypeId, number>;
  rawContributions: Record<ArchetypeId, number>;
  margins: {
    primarySecondary: number;
    secondaryLeastLike: number;
  };
  nearTie: boolean;
}

export interface ComputedResult {
  scores: DimensionScores;
  primary: ArchetypeId;
  secondary: ArchetypeId;
  leastLike: ArchetypeId;
  calibratedScores: Record<ArchetypeId, number>;
  evidence: EvidenceItem[];
  nearTie: boolean;
}

export interface QuestionSetValidation {
  questionCount: number;
  optionCount: number;
  dimensionCoverage: Record<Dimension, number>;
  errors: string[];
}

export type QuestionLookup = Map<number, Question>;
