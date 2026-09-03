import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { RESULT_CONTENT } from "../data/results";
import type { ArchetypeId, DimensionVector } from "../data/types";
import { buildSharePosterSvg, getTopDimensionIds } from "./share-poster";

const SAMPLE_PROFILE: DimensionVector = { R: 64, S: 22, B: 81, D: 47, G: 58, I: 35 };

describe("share poster", () => {
  it("selects exactly the two most prominent dimensions", () => {
    expect(getTopDimensionIds(SAMPLE_PROFILE)).toEqual(["B", "R"]);
  });

  it("generates a complete 3:4 poster for every archetype symbol", () => {
    (Object.keys(ARCHETYPES) as ArchetypeId[]).forEach((id) => {
      const poster = buildSharePosterSvg(
        ARCHETYPES[id],
        RESULT_CONTENT[id],
        SAMPLE_PROFILE,
        "https://example.com/huaxue/",
      );

      expect(poster).toContain('width="1080" height="1440" viewBox="0 0 1080 1440"');
      expect(poster).toContain(ARCHETYPES[id].personName);
      expect(poster).toContain(ARCHETYPES[id].visualSymbol.toUpperCase());
      expect(poster).toContain("一句话暴击");
      expect(poster).toContain("心眼子余额");
      expect(poster).toContain("扫码测测你是谁");
      expect(poster).toContain('shape-rendering="crispEdges"');
    });
  });
});
