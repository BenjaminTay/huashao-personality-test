import {
  formatQuestionNumber,
  formatSampleCount,
  getSampleTotal,
  type Screen,
} from "./quiz-session";

export function HomeScreen({
  subtitle,
  hasSavedProgress,
  answeredCount,
  savedQuestionNumber,
  savedScreen,
  onStart,
  onContinue,
}: {
  subtitle: string;
  hasSavedProgress: boolean;
  answeredCount: number;
  savedQuestionNumber: string;
  savedScreen: Screen;
  onStart: () => void;
  onContinue: () => void;
}) {
  const sampleTotal = getSampleTotal();
  return (
    <section className="home-screen page-enter" aria-labelledby="home-title">
      <div className="home-copy">
        <p className="eyebrow"><span className="red-dot" /> FIELD NOTE / HXT-002</p>
        <h1 id="home-title" className="home-title">
          花 学<br /><em>测 试</em>
        </h1>
        <p className="home-question">你到底是《花少2》里的谁？</p>
        <p className="home-subtitle">{subtitle}</p>
        <div className="home-actions">
          <button className="primary-action" type="button" onClick={onStart}>
            <span>开始测试</span><span className="action-arrow">↗</span>
          </button>
        </div>
        {sampleTotal > 0 && (
          <p className="home-sample">
            <span className="red-dot" aria-hidden="true" />
            测友坐标 · 已有 <strong>{formatSampleCount(sampleTotal)}</strong> 人次完成鉴定
          </p>
        )}
        {hasSavedProgress && (
          <div className="resume-note" role="status">
            <span className="resume-led" />
            <span>
              {savedScreen === "result" || savedScreen === "reveal" || savedScreen === "loading"
                ? "上次的档案还在这里"
                : `已保存 Q${formatQuestionNumber(savedQuestionNumber)} · ${answeredCount}/24`}
            </span>
            <button type="button" onClick={onContinue}>继续 →</button>
          </div>
        )}
      </div>

      <div className="home-art" aria-label="一张带路线和记录章的旅行档案纸" role="img">
        <div className="art-scribble scribble-one">RELATION<br />MAP</div>
        <div className="archive-sheet">
          <div className="sheet-topline"><span>花少2 / TRAVEL GROUP</span><span>DAY 01</span></div>
          <div className="route-map">
            <span className="route-point point-one" /><span className="route-point point-two" />
            <span className="route-point point-three" /><span className="route-point point-four" />
            <span className="route-path route-path-one" /><span className="route-path route-path-two" />
            <span className="route-path route-path-three" />
          </div>
          <div className="sheet-caption">SEASON 02 / GROUP LOG<br /><strong>关系现场记录</strong></div>
          <div className="sheet-stamp">REC<br /><strong>S02</strong></div>
          <div className="sheet-index"><span>行程单 / GROUP OF 7</span><span>NO. 002</span></div>
        </div>
        <div className="ticket ticket-back"><span>花少2 / ITINERARY</span><strong>关系线索</strong><small>DAY 03 · WEATHER: 微妙</small></div>
        <div className="ticket ticket-front"><span>TRAVEL GROUP PASS</span><strong>关系观察<br />入场券</strong><small>ONE SEAT / MANY RELATIONSHIPS</small></div>
        <p className="art-caption">七个人一起出发以后<br />真正的剧情，通常从<br />“我都可以”开始。</p>
      </div>
    </section>
  );
}
