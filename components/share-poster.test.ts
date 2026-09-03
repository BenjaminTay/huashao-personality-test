import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "../data/archetypes";
import { RESULT_CONTENT } from "../data/results";
import type { ArchetypeId, DimensionVector } from "../data/types";
import { buildShareCopy, buildSharePosterSvg, getTopDimensionIds } from "./share-poster";

const SAMPLE_PROFILE: DimensionVector = { R: 64, S: 22, B: 81, D: 47, G: 58, I: 35 };
const TEST_URL = "https://example.com/huaxue/";

describe("share poster", () => {
  it("selects exactly the two most prominent dimensions", () => {
    expect(getTopDimensionIds(SAMPLE_PROFILE)).toEqual(["B", "R"]);
  });

  it("writes a sanitized name into the share headline", () => {
    const poster = buildSharePosterSvg(
      ARCHETYPES.yang,
      RESULT_CONTENT.yang,
      SAMPLE_PROFILE,
      "https://example.com/huaxue/",
      "  小明\n<测试>  ",
    );

    expect(poster).toContain("小明&lt;测试&gt;，你的花少人格是");
    expect(poster).not.toContain("\n&lt;测试&gt;");
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
      expect(poster).toContain(ARCHETYPES[id].englishName);
      expect(poster).toContain("名场面 / ORIGINAL LINE");
      expect(poster).toContain("心眼子余额");
      expect(poster).toContain(RESULT_CONTENT[id].heartEyeBalance);
      expect(poster).toContain("扫码领取你的花学人格");
      expect(poster).toContain('shape-rendering="crispEdges"');
    });
  });

  it("builds a complete share copy for every archetype", () => {
    (Object.keys(ARCHETYPES) as ArchetypeId[]).forEach((id) => {
      const copy = buildShareCopy(RESULT_CONTENT[id], TEST_URL);

      expect(copy.length).toBeGreaterThan(50);
      expect(copy.length).toBeLessThan(180);
      expect(copy).toContain("花学测试");
      expect(copy).toContain(ARCHETYPES[id].personName);
      expect(copy).toContain(ARCHETYPES[id].title);
      expect(copy).toContain(TEST_URL);
      expect(copy).not.toContain("undefined");
      expect(copy).not.toContain("null");
    });
  });
});
