import { ACTS, QUESTIONS } from "../../data/questions";
import { DIMENSION_ORDER } from "../../data/dimensions";
import type { DimensionId } from "../../data/types";
import type { QuizAnswers as AnswerMap } from "../../data/types";

const ACT_NOTES: Record<1 | 2 | 3 | 4, string[]> = {
  1: ["我都可以", "你们定", "先看看再说"],
  2: ["我没事", "别多想", "你怎么了"],
  3: ["先吃饭", "你觉得呢", "把话说清楚"],
  4: ["以后再约", "还联系吗", "下次见"],
};

/**
 * 幕末观察员批注：把本幕每道选择落在"离中立 3 最远"的维度高端/低端，
 * 翻译成行为动词（如"有话直说/读空气"），汇总最多的两种行为生成一句
 * 观察记录。只回显本幕行为事实，不给出人格结论、不改写选项语义。
 */
const OBSERVER_ACTIONS: Record<
  DimensionId,
  { high: string; low: string }
> = {
  R: { high: "反复走心", low: "翻篇很快" },
  S: { high: "逐字读空气", low: "听啥信啥" },
  B: { high: "当场划边界", low: "这忙先不接" },
  D: { high: "有话直说", low: "嗯嗯好的" },
  G: { high: "下场修局", low: "雨我无瓜" },
  I: { high: "先自查", low: "不背这锅" },
};

export function buildObserverLog(
  answers: AnswerMap,
  act: 1 | 2 | 3 | 4,
): string | null {
  const buckets = new Map<string, number>();

  for (const question of QUESTIONS) {
    if (question.act !== act) continue;
    const chosen = answers[question.id];
    const option = question.options.find((item) => item.id === chosen);
    if (!option) continue;
    let bestDimension: DimensionId | null = null;
    let bestDeviation = 0;
    for (const dimension of DIMENSION_ORDER) {
      const value = option.scores[dimension];
      if (value === undefined) continue;
      const deviation = Math.abs(value - 3);
      if (deviation > bestDeviation) {
        bestDeviation = deviation;
        bestDimension = dimension;
      }
    }
    if (bestDimension === null || bestDeviation === 0) continue;
    const value = option.scores[bestDimension] as number;
    const action =
      value > 3
        ? OBSERVER_ACTIONS[bestDimension].high
        : OBSERVER_ACTIONS[bestDimension].low;
    buckets.set(action, (buckets.get(action) ?? 0) + 1);
  }

  if (buckets.size === 0) return null;

  const ranked = [...buckets.entries()].sort(
    (left, right) => right[1] - left[1],
  );
  const shown = ranked.slice(0, 2);
  const shownTotal = shown.reduce((sum, [, count]) => sum + count, 0);
  const rest = 6 - shownTotal;
  const parts = shown.map(([action, count]) => `${action} ×${count}`);
  if (rest > 0) parts.push(`其余 ${rest} 次先围观`);
  return parts.join("、");
}

export function ActScreen({
  act,
  observerLog,
  onContinue,
  onHome,
}: {
  act: (typeof ACTS)[number];
  observerLog: string | null;
  onContinue: () => void;
  onHome: () => void;
}) {
  return (
    <section className={`act-screen page-enter act-${act.act}`} aria-labelledby="act-title">
      <div className="act-topline"><span>CHAPTER TRANSITION</span><span>REC ●</span></div>
      <button className="act-home-action" type="button" onClick={onHome}>
        ← 返回首页
      </button>
      <div className="act-number">0{act.act}</div>
      <p className="eyebrow"><span className="red-dot" /> {act.label}</p>
      <h1 id="act-title">{act.title}</h1>
      <p className="act-status">关系状态：{act.status}</p>
      {observerLog && (
        <div className="observer-note" aria-label="观察员对上一幕的记录">
          <p className="observer-kicker">OBSERVER LOG / 回放上一幕</p>
          <p className="observer-line">{observerLog}</p>
        </div>
      )}
      <div className="act-notes" aria-label="章节观察批注">
        {ACT_NOTES[act.act].map((note, index) => <span key={note} style={{ transform: `rotate(${index % 2 ? 2 : -2}deg)` }}>{`“${note}”`}</span>)}
      </div>
      <div className="act-rule"><span /><small>THE GROUP DYNAMIC IS CHANGING</small><span /></div>
      <button className="primary-action" type="button" onClick={onContinue}><span>{act.act === 1 ? "开演" : "下一幕"}</span><span className="action-arrow">↗</span></button>
    </section>
  );
}
