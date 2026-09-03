import { ACTS, QUESTIONS } from "../../data/questions";
import type { OptionId } from "../../data/types";
import { formatQuestionNumber } from "./quiz-session";

export function QuizScreen({
  question,
  act,
  currentIndex,
  selectedOption,
  isLocked,
  onChoose,
  onPrevious,
  onHome,
}: {
  question: (typeof QUESTIONS)[number];
  act: (typeof ACTS)[number];
  currentIndex: number;
  selectedOption: OptionId | null;
  isLocked: boolean;
  onChoose: (optionId: OptionId) => void;
  onPrevious: () => void;
  onHome: () => void;
}) {
  const questionNumber = currentIndex + 1;
  const progress = (questionNumber / QUESTIONS.length) * 100;

  return (
    <section className="quiz-screen page-enter" aria-labelledby="question-title">
      <div className="quiz-header-row">
        <div>
          <p className="eyebrow"><span className="red-dot" /> {act.label} / {act.title}</p>
          <p className="quiz-status">DAY 0{act.act} · {act.status}</p>
          <button className="quiz-home-action" type="button" onClick={onHome} disabled={isLocked} title="返回首页，当前进度会自动保存">
            ← 返回首页
          </button>
        </div>
        <div className="question-count" aria-label={`第 ${questionNumber} 题，共 ${QUESTIONS.length} 题`}>
          <strong>{formatQuestionNumber(question.id)}</strong><span> / {QUESTIONS.length}</span>
        </div>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={QUESTIONS.length} aria-valuenow={questionNumber} aria-label="答题进度">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="question-card">
        <div className="question-card-top"><span>花少2 / FIELD OBSERVATION</span><span>REC ● / S02</span></div>
        <p className="question-number">QUESTION {formatQuestionNumber(question.id)}</p>
        <h1 id="question-title">{question.title}</h1>
        <p className="question-body">{question.body}</p>
        <div className="option-list" role="group" aria-label="回答选项">
          {question.options.map((option) => {
            const selected = selectedOption === option.id;
            return (
              <button
                className={`option-button${selected ? " is-selected" : ""}`}
                key={option.id}
                type="button"
                aria-pressed={selected}
                disabled={isLocked}
                onClick={() => onChoose(option.id)}
              >
                <span className="option-id">{option.id}</span>
                <span className="option-text">{option.text}</span>
                <span className="option-check" aria-hidden="true">{selected ? "✓" : "↗"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="quiz-bottom-row">
        <button className="back-action" type="button" onClick={onPrevious} disabled={currentIndex === 0 || isLocked}>
          ← 上一题
        </button>
        <span className="auto-note"><span className="signal-bars" aria-hidden="true" /> 选择后自动进入下一题</span>
      </div>
    </section>
  );
}
