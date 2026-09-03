export type DimensionId = "R" | "S" | "B" | "D" | "G" | "I";
export type OptionId = "A" | "B" | "C" | "D";
export type ArchetypeId = "mao" | "xu" | "ning" | "zheng" | "chen" | "jing" | "yang";

export interface QuizOption {
  id: OptionId;
  text: string;
}

export interface QuizQuestion {
  id: string;
  act: 1 | 2 | 3 | 4;
  title: string;
  prompt: string;
  options: QuizOption[];
}

export interface DimensionDefinition {
  id: DimensionId;
  internalName: string;
  displayName: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export type DimensionVector = Record<DimensionId, number>;

export interface ArchetypeProfile extends DimensionVector {
  id: ArchetypeId;
  name: string;
}

export interface QuestionScoring {
  questionId: string;
  dimensions: [DimensionId, DimensionId];
  options: Record<OptionId, Partial<DimensionVector>>;
}

export type QuizAnswers = Partial<Record<string, OptionId>>;

export interface EvidenceItem {
  questionId: string;
  optionId: OptionId;
  primaryContribution: number;
  secondaryContribution: number;
  evidenceScore: number;
  questionTitle: string;
  optionText: string;
}

export interface QuizResult {
  primaryType: ArchetypeId;
  secondaryType: ArchetypeId;
  leastLikeType: ArchetypeId;
  matchScores: Record<ArchetypeId, number>;
  sixDimensionProfile: DimensionVector;
  topEvidenceQuestions: EvidenceItem[];
  primarySecondaryDifference: number;
}
