import { ARCHETYPES } from "../../data/archetypes";
import { RESULT_CONTENT } from "../../data/results";
import { POPULATION_SNAPSHOT } from "../../data/population-stats";
import type { QuizResult as ComputedResult } from "../../data/types";
import {
  formatSampleCount,
  getSamplePercent,
  getSampleTotal,
  SAMPLE_PERCENT_MIN,
} from "./quiz-session";

export function RevealScreen({ result, onOpen }: { result: ComputedResult; onOpen: () => void }) {
  const archetype = ARCHETYPES[result.primaryType];
  const content = RESULT_CONTENT[result.primaryType];
  const sampleTotal = getSampleTotal();
  const ownCount = POPULATION_SNAPSHOT.completions[result.primaryType];
  const sampleLine =
    sampleTotal >= SAMPLE_PERCENT_MIN
      ? `测友坐标 · ${formatSampleCount(sampleTotal)} 人次里，${getSamplePercent(ownCount, sampleTotal).toFixed(1)}% 和你同为${archetype.personName}`
      : null;
  return (
    <section className="reveal-screen page-enter" aria-labelledby="reveal-title">
      <p className="eyebrow"><span className="red-dot" /> RESULT REVEAL / FILE CLOSED</p>
      <p className="reveal-pretitle">你的花学人格原型是</p>
      <h1 id="reveal-title">{archetype.personName}</h1>
      <div className="reveal-line" />
      <p className="reveal-title">{archetype.title}</p>
      <p className="reveal-punchline">{content.punchline}</p>
      {sampleLine && <p className="reveal-sample">{sampleLine}</p>}
      <button className="primary-action" type="button" onClick={onOpen}><span>打开完整档案</span><span className="action-arrow">↗</span></button>
    </section>
  );
}
