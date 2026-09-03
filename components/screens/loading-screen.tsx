export function LoadingScreen({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <section className="loading-screen page-enter" aria-live="polite" aria-busy="true">
      <div className="loading-record"><span className="record-dot" /> ANALYSIS REC / CASE #002</div>
      <div className="scanner" aria-hidden="true"><span /><span /><span /></div>
      <p className="loading-kicker">HUAXUE TEST PROCESSING</p>
      <h1>{line}</h1>
      <p className="loading-small">24 次选择，正在归档成一份花学档案。</p>
      <button className="skip-action" type="button" onClick={onSkip}>跳过等待 →</button>
    </section>
  );
}
