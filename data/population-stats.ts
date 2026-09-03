import type { ArchetypeId } from "./types";

export const POPULATION_SNAPSHOT_SCHEMA_VERSION = "1";

export interface PopulationSnapshot {
  generatedAt: string | null;
  since: string;
  completions: Record<ArchetypeId, number>;
}

export const POPULATION_SNAPSHOT: PopulationSnapshot = {
  generatedAt: "2026-09-03T10:08:27.933Z",
  since: "",
  completions: { mao: 0, xu: 0, ning: 0, zheng: 0, chen: 0, jing: 0, yang: 1 },
};
