"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ACTS, QUESTIONS, QUESTION_SET_VERSION } from "../data/questions";
import { ARCHETYPES, type Archetype } from "../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../data/dimensions";
import {
  RESULT_CONTENT,
  RESULT_DISCLAIMER,
  type PersonalityResultContent,
} from "../data/results";
import type { ArchetypeId, OptionId } from "../data/types";
import { calculateResult } from "../lib/scoring";
import type { AnswerMap, ComputedResult } from "../types";

type Screen = "home" | "quiz" | "act" | "loading" | "reveal" | "result";

const STORAGE_KEY = `flower-studies-archive-session-v${QUESTION_SET_VERSION}`;
const LOADING_LINES = [
  "正在整理你的 24 个选择……",
  "正在比较你在不同场合的反应……",
  "正在查看你对关系和边界的处理方式……",
  "正在生成你的花少2人格档案……",
  "马上就好……",
];

const HOME_SUBTITLES = [
  "看看你在旅行团里通常是什么位置。",
  "测测你遇到复杂关系时会怎么处理。",
  "一份根据你的选择生成的花少2娱乐人格档案。",
];

const ACT_NOTES: Record<1 | 2 | 3 | 4, string[]> = {
  1: ["我都可以", "你们定", "先看看再说"],
  2: ["我没事", "别多想", "你怎么了"],
  3: ["先吃饭", "你觉得呢", "把话说清楚"],
  4: ["以后再约", "还联系吗", "下次见"],
};

const RESULT_SYMBOLS: Record<ArchetypeId, string> = {
  mao: "map",
  xu: "truth",
  ning: "boundary",
  zheng: "error-log",
  chen: "exit",
  jing: "repair",
  yang: "tourist",
};

function isOptionId(value: unknown): value is OptionId {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function sanitizeAnswers(value: unknown): AnswerMap {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const clean: AnswerMap = {};
  for (const question of QUESTIONS) {
    const optionId = source[String(question.id)];
    if (
      isOptionId(optionId) &&
      question.options.some((option) => option.id === optionId)
    ) {
      clean[question.id] = optionId;
    }
  }
  return clean;
}

function readSession(): {
  answers: AnswerMap;
  currentIndex: number;
  screen: Screen;
} | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const answers = sanitizeAnswers(parsed.answers);
    const currentIndex =
      typeof parsed.currentIndex === "number"
        ? Math.min(Math.max(Math.floor(parsed.currentIndex), 0), QUESTIONS.length - 1)
        : 0;
    const validScreens: Screen[] = [
      "home",
      "quiz",
      "act",
      "loading",
      "reveal",
      "result",
    ];
    const screen = validScreens.includes(parsed.screen as Screen)
      ? (parsed.screen as Screen)
      : "quiz";
    return { answers, currentIndex, screen };
  } catch {
    return null;
  }
}

function formatQuestionNumber(value: string | number): string {
  return String(value).replace(/^Q/, "").padStart(2, "0");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapShareText(value: string, maxLength: number): string[] {
  const characters = Array.from(value);
  const lines: string[] = [];
  for (let index = 0; index < characters.length; index += maxLength) {
    lines.push(characters.slice(index, index + maxLength).join(""));
  }
  return lines;
}

function createShareCardSvg(
  archetype: Archetype,
  content: PersonalityResultContent,
  displayScores: ComputedResult["sixDimensionProfile"],
): string {
  const shareLines = wrapShareText(content.share, 18).slice(0, 3);
  const dimensionRows = DIMENSION_ORDER.map((dimension, index) => {
    const definition = DIMENSIONS[dimension];
    const score = displayScores[dimension];
    const y = 790 + index * 43;
    return `<text x="72" y="${y}" fill="#6f7069" font-family="monospace" font-size="16">${dimension}  ${escapeXml(definition.displayName)}</text>
      <rect x="310" y="${y - 14}" width="360" height="9" fill="#d5c8b4"/>
      <rect x="310" y="${y - 14}" width="${score * 3.6}" height="9" fill="#4c7180"/>
      <text x="730" y="${y}" fill="#87392f" font-family="monospace" font-size="18">${score}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#f3efe6"/>
    <path d="M48 48H852M48 1152H852" stroke="#b64c3e" stroke-width="2" opacity=".55"/>
    <path d="M48 138H852" stroke="#1d211d" stroke-width="1" opacity=".22"/>
    <text x="60" y="88" fill="#1d211d" font-family="monospace" font-size="16" letter-spacing="3">FLOWER STUDIES ARCHIVE</text>
    <text x="840" y="88" fill="#6f7069" font-family="monospace" font-size="15" text-anchor="end">CASE #002</text>
    <text x="60" y="235" fill="#b64c3e" font-family="serif" font-size="28" letter-spacing="10">花 少 人 格</text>
    <text x="60" y="295" fill="#1d211d" font-family="serif" font-size="62" font-weight="700" letter-spacing="8">鉴 定</text>
    <text x="60" y="360" fill="#b64c3e" font-family="monospace" font-size="17" letter-spacing="4">${escapeXml(archetype.englishName)}</text>
    <text x="60" y="455" fill="#1d211d" font-family="serif" font-size="78" font-weight="700">${escapeXml(archetype.personName)}</text>
    <text x="60" y="500" fill="#4c7180" font-family="serif" font-size="30" font-weight="700">${escapeXml(archetype.title)}</text>
    <path d="M60 545H840" stroke="#1d211d" stroke-width="1" opacity=".22"/>
    ${shareLines.map((line, index) => `<text x="60" y="${590 + index * 30}" fill="#4f514b" font-family="serif" font-size="21">${escapeXml(line)}</text>`).join("\n")}
    <text x="60" y="710" fill="#b64c3e" font-family="monospace" font-size="14" letter-spacing="2">SIX-DIMENSION FIELD READOUT</text>
    ${dimensionRows}
    <circle cx="750" cy="1035" r="61" fill="none" stroke="#b64c3e" stroke-width="2"/>
    <text x="750" y="1028" fill="#b64c3e" font-family="monospace" font-size="15" text-anchor="middle">HEART-EYE</text>
    <text x="750" y="1052" fill="#b64c3e" font-family="serif" font-size="22" text-anchor="middle">${escapeXml(content.keywords[0])}</text>
    <text x="60" y="1110" fill="#6f7069" font-family="monospace" font-size="14">纯娱乐原型 · 3:4 ARCHIVE CARD</text>
  </svg>`;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [pendingOption, setPendingOption] = useState<OptionId | null>(null);
  const [result, setResult] = useState<ComputedResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [savedScreen, setSavedScreen] = useState<Screen>("quiz");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const currentAct = ACTS.find((act) => act.act === currentQuestion?.act) ?? ACTS[0];
  const answeredCount = Object.keys(answers).length;
  const savedQuestionNumber = currentQuestion?.id ?? "Q01";
  const homeSubtitle = HOME_SUBTITLES[0];

  useEffect(() => {
    const session = readSession();
    if (session) {
      const complete = QUESTIONS.every((question) => session.answers[question.id]);
      setAnswers(session.answers);
      setCurrentIndex(session.currentIndex);
      setHasSavedProgress(Object.keys(session.answers).length > 0);
      setSavedScreen(session.screen);

      if (complete && ["loading", "reveal", "result"].includes(session.screen)) {
        try {
          setResult(calculateResult(session.answers));
          setScreen(session.screen === "loading" ? "reveal" : session.screen);
        } catch {
          setScreen("home");
        }
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          answers,
          currentIndex,
          screen,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Private browsing and storage quotas should not interrupt the quiz.
    }
  }, [answers, currentIndex, hydrated, screen]);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  useEffect(() => {
    if (screen !== "loading") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setScreen("reveal");
      return;
    }

    setLoadingIndex(0);
    const lineTimer = window.setInterval(() => {
      setLoadingIndex((index) => Math.min(index + 1, LOADING_LINES.length - 1));
    }, 720);
    const revealTimer = window.setTimeout(() => setScreen("reveal"), 3900);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(revealTimer);
    };
  }, [screen]);

  function startFresh() {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing and storage quotas should not interrupt a fresh run.
    }
    setAnswers({});
    setCurrentIndex(0);
    setPendingOption(null);
    setResult(null);
    setHasSavedProgress(false);
    setSavedScreen("quiz");
    setScreen("act");
  }

  function continueSaved() {
    if (result && ["loading", "reveal", "result"].includes(savedScreen)) {
      setScreen(savedScreen === "loading" ? "reveal" : savedScreen);
      return;
    }
    setScreen(savedScreen === "act" ? "act" : "quiz");
  }

  function goHome() {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    setPendingOption(null);
    setSavedScreen("quiz");
    setScreen("home");
  }

  function chooseOption(optionId: OptionId) {
    if (!currentQuestion || pendingOption) return;

    setPendingOption(optionId);
    const nextAnswers: AnswerMap = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(nextAnswers);
    setHasSavedProgress(Object.keys(nextAnswers).length > 0);

    transitionTimer.current = setTimeout(() => {
      const nextIndex = currentIndex + 1;
      setPendingOption(null);

      if (nextIndex >= QUESTIONS.length) {
        try {
          const computed = calculateResult(nextAnswers);
          setResult(computed);
          setScreen("loading");
        } catch {
          setScreen("quiz");
        }
        return;
      }

      const nextQuestion = QUESTIONS[nextIndex];
      setCurrentIndex(nextIndex);
      if (nextQuestion.act !== currentQuestion.act) {
        setScreen("act");
      } else {
        setScreen("quiz");
      }
    }, 230);
  }

  function goPrevious() {
    if (currentIndex === 0 || pendingOption) return;
    setCurrentIndex((index) => Math.max(index - 1, 0));
    setScreen("quiz");
  }

  if (!hydrated) {
    return <div className="boot-screen">正在打开档案……</div>;
  }

  return (
    <main className="site-shell">
      <div className="paper-grain" aria-hidden="true" />
      <header className="archive-header">
        <div className="archive-brand">
          <span className="brand-mark">✳</span>
          <span>花少 · TRAVEL GROUP STUDY</span>
        </div>
        <div className="header-case">S02 / {screen === "home" ? "OPEN" : "REC"}</div>
      </header>

      <div className="page-wrap">
        {screen === "home" && (
          <HomeScreen
            subtitle={homeSubtitle}
            hasSavedProgress={hasSavedProgress}
            answeredCount={answeredCount}
            savedQuestionNumber={savedQuestionNumber}
            savedScreen={savedScreen}
            onStart={startFresh}
            onContinue={continueSaved}
          />
        )}

        {screen === "quiz" && currentQuestion && (
          <QuizScreen
            question={currentQuestion}
            act={currentAct}
            currentIndex={currentIndex}
            selectedOption={pendingOption ?? answers[currentQuestion.id] ?? null}
            isLocked={pendingOption !== null}
            onChoose={chooseOption}
            onPrevious={goPrevious}
            onHome={goHome}
          />
        )}

        {screen === "act" && (
          <ActScreen act={currentAct} onContinue={() => setScreen("quiz")} onHome={goHome} />
        )}

        {screen === "loading" && <LoadingScreen line={LOADING_LINES[loadingIndex]} onSkip={() => setScreen("reveal")} />}

        {screen === "reveal" && result && (
          <RevealScreen result={result} onOpen={() => setScreen("result")} />
        )}

        {screen === "result" && result && (
          <ResultScreen result={result} onRetake={startFresh} />
        )}
      </div>

    </main>
  );
}

function HomeScreen({
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
  return (
    <section className="home-screen page-enter" aria-labelledby="home-title">
      <div className="home-copy">
        <p className="eyebrow"><span className="red-dot" /> FIELD NOTE / FSA-002</p>
        <h1 id="home-title" className="home-title">
          花 少<br /><em>人 格 鉴 定</em>
        </h1>
        <p className="home-question">你到底是《花少2》里的谁？</p>
        <p className="home-subtitle">{subtitle}</p>
        <div className="home-actions">
          <button className="primary-action" type="button" onClick={onStart}>
            <span>开始鉴定</span><span className="action-arrow">↗</span>
          </button>
        </div>
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

function QuizScreen({
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

function ActScreen({ act, onContinue, onHome }: { act: (typeof ACTS)[number]; onContinue: () => void; onHome: () => void }) {
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
      <div className="act-notes" aria-label="章节观察批注">
        {ACT_NOTES[act.act].map((note, index) => <span key={note} style={{ transform: `rotate(${index % 2 ? 2 : -2}deg)` }}>{`“${note}”`}</span>)}
      </div>
      <div className="act-rule"><span /><small>THE GROUP DYNAMIC IS CHANGING</small><span /></div>
      <button className="primary-action" type="button" onClick={onContinue}><span>继续观察</span><span className="action-arrow">↗</span></button>
    </section>
  );
}

function LoadingScreen({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <section className="loading-screen page-enter" aria-live="polite" aria-busy="true">
      <div className="loading-record"><span className="record-dot" /> ANALYSIS REC / CASE #002</div>
      <div className="scanner" aria-hidden="true"><span /><span /><span /></div>
      <p className="loading-kicker">ARCHIVE PROCESSING</p>
      <h1>{line}</h1>
      <p className="loading-small">正在整理 24 次现场反应，马上归档。</p>
      <button className="skip-action" type="button" onClick={onSkip}>跳过等待 →</button>
    </section>
  );
}

function RevealScreen({ result, onOpen }: { result: ComputedResult; onOpen: () => void }) {
  const archetype = ARCHETYPES[result.primaryType];
  const content = RESULT_CONTENT[result.primaryType];
  return (
    <section className="reveal-screen page-enter" aria-labelledby="reveal-title">
      <p className="eyebrow"><span className="red-dot" /> RESULT REVEAL / FILE CLOSED</p>
      <p className="reveal-pretitle">你的花学人格原型是</p>
      <h1 id="reveal-title">{archetype.personName}</h1>
      <div className="reveal-line" />
      <p className="reveal-title">{archetype.title}</p>
      <p className="reveal-punchline">{content.punchline}</p>
      <button className="primary-action" type="button" onClick={onOpen}><span>打开完整档案</span><span className="action-arrow">↗</span></button>
    </section>
  );
}

function ResultScreen({ result, onRetake }: { result: ComputedResult; onRetake: () => void }) {
  const primary = ARCHETYPES[result.primaryType];
  const secondary = ARCHETYPES[result.secondaryType];
  const leastLike = ARCHETYPES[result.leastLikeType];
  const content = RESULT_CONTENT[result.primaryType];
  const secondaryContent = RESULT_CONTENT[result.secondaryType];
  const shareCardSvg = useMemo(
    () => createShareCardSvg(primary, content, result.sixDimensionProfile),
    [content, primary, result.sixDimensionProfile],
  );
  const shareCardHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shareCardSvg)}`;

  return (
    <section className="result-screen page-enter" aria-labelledby="result-title">
      <div className="result-file-head">
        <div><p className="eyebrow"><span className="red-dot" /> PERSONALITY FILE / FSA-002</p><p className="result-timecode">TRAVEL GROUP / FIELD REPORT</p></div>
        <span className={`result-symbol symbol-${RESULT_SYMBOLS[result.primaryType]}`} aria-hidden="true" />
      </div>
      <div className="result-hero">
        <p className="result-english">{primary.englishName}</p>
        <h1 id="result-title">{primary.personName}</h1>
        <p className="result-type-title">{primary.title}</p>
        <div className="result-scene-quote">
          <span>花少2 / 花学档案文案</span>
          <blockquote>“{content.share}”</blockquote>
        </div>
        <p className="result-punchline">{content.punchline}</p>
        <div className="result-strategy"><span>YOUR DEFAULT STRATEGY</span><strong>{primary.strategy}</strong></div>
      </div>

      <section className="result-section dimension-section" aria-labelledby="dimensions-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="red-dot" /> FIELD READOUT 01</p><h2 id="dimensions-title">六维关系画像</h2></div><span className="score-note">展示分 / 0—100</span></div>
        <div className="dimension-grid">
          {DIMENSION_ORDER.map((dimension) => {
            const definition = DIMENSIONS[dimension];
            const score = result.sixDimensionProfile[dimension];
            return (
              <article className="dimension-card" key={dimension}>
                <div className="dimension-card-head"><span className="dimension-id">{dimension}</span><strong>{definition.displayName}</strong><b>{score}</b></div>
                <p>{definition.description}</p>
                <div className="score-bar" role="img" aria-label={`${definition.displayName}展示分 ${score} 分`}><span style={{ width: `${score}%` }} /></div>
                <div className="score-labels"><span>{definition.lowLabel}</span><span>{definition.highLabel}</span></div>
              </article>
            );
          })}
        </div>
        <p className="score-footnote">本次现场读数</p>
      </section>

      <section className="result-section core-section" aria-labelledby="core-title">
        <div className="core-layout">
          <div className="core-stamp" aria-hidden="true">S02<br /><strong>LOG</strong></div>
          <div>
            <p className="eyebrow"><span className="red-dot" /> 你的相处方式 / RELATION NOTE</p>
            <h2 id="core-title">核心算法</h2>
            <p className="core-analysis">{content.core}</p>
            <p className="misunderstood-note"><span>最容易被误会成</span>{content.misunderstood} {content.misunderstoodExplain}</p>
          </div>
        </div>
      </section>

      <section className="result-section evidence-section" aria-labelledby="evidence-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="red-dot" /> FIELD READOUT 02</p><h2 id="evidence-title">为什么是你</h2></div><span className="evidence-count">3 RECORDS</span></div>
        <div className="evidence-list">
          {result.topEvidenceQuestions.map((evidence, index) => (
            <article className="evidence-card" key={`${evidence.questionId}-${evidence.optionId}`}>
              <div className="evidence-mark">0{index + 1}</div>
              <div><p className="evidence-question">Q{formatQuestionNumber(evidence.questionId)} / {evidence.questionTitle} · 选择 {evidence.optionId}</p><p>{evidence.optionText}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="result-section split-section" aria-label="高光面与花少 BUG">
        <article className="side-card bright-card"><p className="eyebrow"><span className="green-dot" /> HIGH LIGHT</p><h2>Bright Side</h2><p>{content.bright}</p></article>
        <article className="side-card bug-card"><p className="eyebrow"><span className="red-dot" /> FLOWER BUG</p><h2>花少 Bug</h2><p>{content.bug}</p></article>
      </section>

      <section className="result-section cast-section" aria-labelledby="cast-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="red-dot" /> RELATION MAP</p><h2 id="cast-title">你的其他坐标</h2></div></div>
        <div className="cast-grid">
          <article className="cast-card secondary-card"><span className="cast-label">副型 / SECONDARY</span><h3>{secondary.personName}</h3><p>{secondary.title}</p><div className="cast-strategy">更接近：{secondary.strategy}</div><small>{secondaryContent.keywords.join(" · ")}</small></article>
          <article className="cast-card least-card"><span className="cast-label">最不像 / LEAST LIKE</span><h3>{leastLike.personName}</h3><p>{leastLike.title}</p><div className="cast-strategy">相反方向：{leastLike.strategy}</div></article>
        </div>
      </section>

      <section className="result-section meme-section" aria-label="花学彩蛋">
        <div className="meme-block"><p className="eyebrow"><span className="red-dot" /> HEART-EYE BALANCE / 花学批注</p><h2>心眼子状态</h2><p>{content.heartschemes}</p></div>
      </section>

      <section className="result-section share-section" aria-labelledby="share-title">
        <div className="share-card-preview" aria-label="3:4 分享档案卡预览" role="img">
          <div className="share-card-header"><span>FLOWER STUDIES ARCHIVE</span><span>CASE #002</span></div>
          <p className="share-card-kicker">{primary.englishName}</p>
          <h2>{primary.personName}</h2>
          <p className="share-card-title">{primary.title}</p>
          <p className="share-card-copy">{content.share}</p>
          <div className="share-card-bars">
            {DIMENSION_ORDER.map((dimension) => <span key={dimension} style={{ height: `${Math.max(18, result.sixDimensionProfile[dimension] * 0.52)}px` }} title={`${DIMENSIONS[dimension].displayName} ${result.sixDimensionProfile[dimension]}`} />)}
          </div>
          <div className="share-card-footer"><span>3:4 ARCHIVE CARD</span><strong>{content.keywords[0]}</strong></div>
        </div>
        <div className="share-copy-block">
          <p className="eyebrow"><span className="red-dot" /> SHAREABLE FILE</p>
          <h2 id="share-title">把这份档案带走</h2>
          <p>一张适合发出去的 3:4 花学档案卡，把你的类型和名场面带走。</p>
          <a className="download-action" href={shareCardHref} download={`flower-studies-${result.primaryType}-archive.svg`}>下载 3:4 档案卡 <span>↘</span></a>
          <p className="share-format-note">9:16 竖屏版本接口已预留 · 可直接使用结果页截图分享</p>
        </div>
      </section>

      <div className="result-disclaimer"><strong>娱乐原型说明</strong><p>{RESULT_DISCLAIMER}</p></div>
      <div className="result-actions"><button className="primary-action" type="button" onClick={onRetake}><span>重新鉴定</span><span className="action-arrow">↗</span></button><button className="text-action" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到档案顶部 ↑</button></div>
    </section>
  );
}
