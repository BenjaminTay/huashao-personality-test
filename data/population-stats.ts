import type { ArchetypeId } from "./types";

export const POPULATION_SNAPSHOT_SCHEMA_VERSION = "1";

export interface PopulationSnapshot {
  generatedAt: string | null;
  since: string;
  completions: Record<ArchetypeId, number>;
}

export const POPULATION_SNAPSHOT: PopulationSnapshot = {
  generatedAt: "2026-09-07T15:06:58.922Z",
  since: "2026-09-01",
  completions: { mao: 78, xu: 12, ning: 39, zheng: 23, chen: 56, jing: 61, yang: 137 },
};
