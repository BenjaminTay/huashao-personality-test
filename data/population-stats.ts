import type { ArchetypeId } from "./types";

export const POPULATION_SNAPSHOT_SCHEMA_VERSION = "1";

export interface PopulationSnapshot {
  generatedAt: string | null;
  since: string;
  completions: Record<ArchetypeId, number>;
}

export const POPULATION_SNAPSHOT: PopulationSnapshot = {
  generatedAt: "2026-09-04T12:11:56.845Z",
  since: "",
  completions: { mao: 19, xu: 7, ning: 11, zheng: 10, chen: 13, jing: 21, yang: 41 },
};
