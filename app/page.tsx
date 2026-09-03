"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ACTS, QUESTIONS, QUESTION_SET_VERSION } from "../data/questions";
import { ARCHETYPES } from "../data/archetypes";
import { DIMENSIONS, DIMENSION_ORDER } from "../data/dimensions";
import {
  RESULT_CONTENT,
  RESULT_DISCLAIMER,
} from "../data/results";
import type { ArchetypeId, OptionId } from "../data/types";
import { POPULATION_SNAPSHOT } from "../data/population-stats";
import { calculateResult, getQuestionContribution } from "../lib/scoring";
import {
  trackShareCard,
  trackShareImage,
  trackTestComplete,
  trackTestStart,
} from "../lib/analytics";
import type { AnswerMap, ComputedResult } from "../types";
import {
  buildSharePosterSvg,
  getTestEntryUrl,
  normalizeShareName,
  sharePosterAsImage,
  SharePoster,
} from "../components/share-poster";
import { ResultPreviewBar } from "../components/result-preview-bar";

type Screen = "home" | "quiz" | "act" | "loading" | "reveal" | "result";

const STORAGE_KEY = `huaxue-test-session-v${QUESTION_SET_VERSION}`;
const LEGACY_STORAGE_KEY = `flower-studies-archive-session-v${QUESTION_SET_VERSION}`;
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

const SAMPLE_PERCENT_MIN = 50;

function formatSampleCount(value: number): string {
  return value.toLocaleString("zh-CN");
}

function formatSampleDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function getSampleTotal(): number {
  return Object.values(POPULATION_SNAPSHOT.completions).reduce(
    (sum, count) => sum + count,
    0,
  );
}

function getSamplePercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

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
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
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

/**
 * 本地验收用：为指定人格生成"全程选最贴近该型选项"的 24 题答案路径，
 * 与模型诊断里的自洽路径口径一致（主型必然回到自身）。不手写 mock 答案。
 */
function buildTypeAnswers(type: ArchetypeId): AnswerMap {
  const answers: AnswerMap = {};
  for (const question of QUESTIONS) {
    let bestOption = question.options[0].id;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const option of question.options) {
      const score = getQuestionContribution(type, question.id, option.id);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option.id;
      }
    }
    answers[question.id] = bestOption;
  }
  return answers;
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
  const [homeSubtitle, setHomeSubtitle] = useState(HOME_SUBTITLES[0]);
  const [previewType, setPreviewType] = useState<ArchetypeId | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const previewBackup = useRef<{
    answers: AnswerMap;
    currentIndex: number;
    screen: Screen;
    result: ComputedResult | null;
  } | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const currentAct = ACTS.find((act) => act.act === currentQuestion?.act) ?? ACTS[0];
  const answeredCount = Object.keys(answers).length;
  const savedQuestionNumber = currentQuestion?.id ?? "Q01";

  useEffect(() => {
    setHomeSubtitle(
      HOME_SUBTITLES[Math.floor(Math.random() * HOME_SUBTITLES.length)],
    );
  }, []);

  useEffect(() => {
    const devServer = process.env.NODE_ENV === "development";
    const hasPreviewFlag =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("preview");
    setPreviewEnabled(devServer || hasPreviewFlag);
  }, []);

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
    if (!hydrated || previewType) return;

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
  }, [answers, currentIndex, hydrated, previewType, screen]);

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
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
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

  function enterPreview(type: ArchetypeId) {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (!previewBackup.current) {
      previewBackup.current = { answers, currentIndex, screen, result };
    }
    const answersForType = buildTypeAnswers(type);
    try {
      const computed = calculateResult(answersForType);
      setPendingOption(null);
      setAnswers(answersForType);
      setCurrentIndex(QUESTIONS.length - 1);
      setResult(computed);
      setPreviewType(type);
      setScreen("result");
    } catch {
      // 数据异常时保持当前画面，不打断用户
    }
  }

  function exitPreview() {
    setPreviewType(null);
    const backup = previewBackup.current;
    previewBackup.current = null;
    if (backup) {
      setAnswers(backup.answers);
      setCurrentIndex(backup.currentIndex);
      setResult(backup.result);
      setScreen(backup.screen);
    } else {
      setScreen("home");
    }
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
          trackTestComplete(computed.primaryType);
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
          <span>花学测试 · TRAVEL GROUP</span>
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
            onStart={() => {
              trackTestStart();
              startFresh();
            }}
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

      {previewEnabled && (
        <ResultPreviewBar
          active={previewType}
          onPick={enterPreview}
          onExit={exitPreview}
        />
      )}
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
      <p className="loading-kicker">HUAXUE TEST PROCESSING</p>
      <h1>{line}</h1>
      <p className="loading-small">24 次选择，正在归档成一份花学档案。</p>
      <button className="skip-action" type="button" onClick={onSkip}>跳过等待 →</button>
    </section>
  );
}

function RevealScreen({ result, onOpen }: { result: ComputedResult; onOpen: () => void }) {
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

function ResultScreen({ result, onRetake }: { result: ComputedResult; onRetake: () => void }) {
  const primary = ARCHETYPES[result.primaryType];
  const secondary = ARCHETYPES[result.secondaryType];
  const leastLike = ARCHETYPES[result.leastLikeType];
  const content = RESULT_CONTENT[result.primaryType];
  const secondaryContent = RESULT_CONTENT[result.secondaryType];
  const sampleTotal = getSampleTotal();
  const sampleDate = formatSampleDate(POPULATION_SNAPSHOT.generatedAt);
  const sampleShowPercent = sampleTotal >= SAMPLE_PERCENT_MIN;
  const ownSamplePercent = getSamplePercent(
    POPULATION_SNAPSHOT.completions[result.primaryType],
    sampleTotal,
  );
  const [shareName, setShareName] = useState("");
  const cleanShareName = normalizeShareName(shareName);
  const testUrl = useMemo(() => getTestEntryUrl(), []);
  const shareCardSvg = useMemo(
    () => buildSharePosterSvg(primary, content, result.sixDimensionProfile, testUrl, cleanShareName),
    [cleanShareName, content, primary, result.sixDimensionProfile, testUrl],
  );
  const shareCardHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shareCardSvg)}`;

  return (
    <section className="result-screen page-enter" aria-labelledby="result-title">
      <div className="result-file-head">
        <div><p className="eyebrow"><span className="red-dot" /> PERSONALITY FILE / HXT-002</p><p className="result-timecode">TRAVEL GROUP / FIELD REPORT</p></div>
        <span className={`result-symbol symbol-${primary.visualSymbol}`} aria-hidden="true" />
      </div>
      <div className="result-hero">
        <p className="result-english">{primary.englishName}</p>
        <h1 id="result-title">{primary.personName}</h1>
        <p className="result-type-title">{primary.title}</p>
        <p className="result-type-strategy"><span>花学默认姿势</span>{primary.strategy}</p>
        <div className="hero-stack">
          <figure className="recall-card result-hero-quote">
            <blockquote>“{content.recall.quote}”</blockquote>
            <figcaption>
              <p className="recall-note">{content.recall.note}</p>
            </figcaption>
          </figure>
          <aside className="heart-card" aria-label="心眼子状态">
            <p className="heart-card-kicker">心眼子余额</p>
            <strong>{content.heartEyeBalance}</strong>
            <p className="heart-card-copy">{content.heartschemes}</p>
          </aside>
        </div>
      </div>

      <section className="result-section manual-section" aria-label="人格分析">
        <p className="manual-main">{content.core}</p>
        <h3 className="manual-side-title"><span className="green-dot" aria-hidden="true" />{content.highTitle}</h3>
        <p className="manual-side-body">{content.high}</p>
        <h3 className="manual-side-title"><span className="red-dot" aria-hidden="true" />{content.flawTitle}</h3>
        <p className="manual-side-body">{content.flaw}</p>
        <p className="manual-misread"><span>你可能被误读成</span>{content.misread}</p>
      </section>

      <section className="result-section dimension-section" aria-labelledby="dimensions-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="red-dot" /> 属性面板</p><h2 id="dimensions-title">关系属性面板</h2></div><span className="score-note">0—100 · 按 24 次选择换算</span></div>
        <div className="dimension-grid">
          {DIMENSION_ORDER.map((dimension) => {
            const definition = DIMENSIONS[dimension];
            const score = result.sixDimensionProfile[dimension];
            return (
              <article className="dimension-card" key={dimension} title={definition.description}>
                <div className="dimension-card-head"><strong>{definition.displayName}</strong><b>{score}</b></div>
                <div className="score-bar" role="img" aria-label={`${definition.displayName} ${score} 分`}><span style={{ width: `${score}%` }} /></div>
                <div className="score-labels"><span>{definition.lowLabel}</span><span>{definition.highLabel}</span></div>
              </article>
            );
          })}
        </div>
        <p className="score-footnote">属性点只反映你这次的选择，不给你下定义——留着跟朋友互相伤害用。</p>
      </section>

      <section className="result-section cast-section" aria-label="第二人格与绝缘人格">
        <div className="cast-grid">
          <article className="cast-card secondary-card">
            <span className="cast-role">第二人格</span>
            <h3>{secondary.personName}</h3>
            <p>{secondary.title}</p>
            <p className="cast-why">全场第二接近你的型：同一套关系现场里，它是你身上的另一套打法，有些题你会和 TA 选得一样。</p>
            <div className="cast-strategy">备用模式：{secondary.strategy}</div>
            <small>{secondaryContent.keywords.join(" · ")}</small>
          </article>
          <article className="cast-card least-card">
            <span className="cast-role">绝缘人格</span>
            <h3>{leastLike.personName}</h3>
            <p>{leastLike.title}</p>
            <p className="cast-why">七型里离你最远的一位：TA 的默认反应和你几乎零重叠，你很难成为 TA，也基本不会吃 TA 那一套。</p>
            <div className="cast-strategy">TA 的默认：{leastLike.strategy}</div>
          </article>
        </div>
      </section>

      <section className="result-section share-section" aria-labelledby="share-title">
        <SharePoster
          archetype={primary}
          content={content}
          displayScores={result.sixDimensionProfile}
          testUrl={testUrl}
          displayName={cleanShareName}
        />
        <div className="share-copy-block">
          <p className="eyebrow"><span className="red-dot" /> 分享现场</p>
          <h2 id="share-title">把这张海报带走</h2>
          <p>填写姓名后，海报会显示“XXX，你的花少人格是”。</p>
          <div className="share-personalize">
            <label htmlFor="share-name"><span>PERSONALIZE / 姓名</span>姓名（可选）</label>
            <input
              id="share-name"
              name="share-name"
              type="text"
              value={shareName}
              maxLength={10}
              placeholder="请输入姓名"
              autoComplete="nickname"
              onChange={(event) => setShareName(event.target.value)}
              aria-describedby="share-name-help"
            />
            <p id="share-name-help">姓名仅用于本地生成，不会上传。</p>
          </div>
          <a
            className="download-action"
            href={shareCardHref}
            download={`huaxue-share-poster-${result.primaryType}.svg`}
            onClick={() => trackShareCard()}
          >下载{cleanShareName ? ` ${cleanShareName}的` : "我的"} 3:4 海报 <span>↘</span></a>
          <button
            className="download-action share-image-action"
            type="button"
            onClick={() => {
              trackShareImage();
              void sharePosterAsImage(
                shareCardSvg,
                `huaxue-share-poster-${result.primaryType}`,
              ).catch(() => {
                // 分享被取消或导出失败时静默：保留 SVG 下载路径
              });
            }}
          >分享/保存成图片 <span>↗</span></button>
          <p className="share-format-note">下载原图，或手机直接存图分享 · 二维码就是本测试入口</p>
        </div>
      </section>

      <section className="result-section sample-section" aria-labelledby="sample-title">
        <div className="section-heading">
          <div><p className="eyebrow"><span className="red-dot" /> 测友坐标 / 同好分布</p><h2 id="sample-title">一起测过的朋友</h2></div>
          <span className="score-note">{sampleDate ? `截至 ${sampleDate}` : "等待首次采集"}</span>
        </div>
        {sampleTotal > 0 ? (
          <>
            <p className="sample-lead">
              {sampleShowPercent
                ? `已有 ${formatSampleCount(sampleTotal)} 人次完成鉴定，其中 ${ownSamplePercent.toFixed(1)}% 和你同为 ${primary.personName}。`
                : `目前有 ${formatSampleCount(sampleTotal)} 人次完成鉴定，样本还在积累中——把档案卡发出去，让分母变大。`}
            </p>
            <div className="sample-list">
              {(Object.keys(ARCHETYPES) as ArchetypeId[]).map((id) => {
                const count = POPULATION_SNAPSHOT.completions[id];
                const percent = getSamplePercent(count, sampleTotal);
                const isOwn = id === result.primaryType;
                return (
                  <div className={`sample-row${isOwn ? " is-own" : ""}`} key={id}>
                    <span className="sample-name">{ARCHETYPES[id].personName}</span>
                    <div className="score-bar" role="img" aria-label={`${ARCHETYPES[id].personName} ${formatSampleCount(count)} 人次`}>
                      <span style={{ width: count > 0 ? `${Math.max(percent, 3)}%` : "0%" }} />
                    </div>
                    <span className="sample-num">
                      {formatSampleCount(count)}
                      {sampleShowPercent && <i>{percent.toFixed(1)}%</i>}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="score-footnote">按人次统计 · 只记录主型 · 匿名聚合 · 每日更新</p>
          </>
        ) : (
            <p className="sample-empty">样本还没开张：你是第一位完成鉴定的吗？把档案卡发给朋友，让“测友坐标”长出来。</p>
          )}
      </section>

      <div className="result-disclaimer"><strong>娱乐原型说明</strong><p>{RESULT_DISCLAIMER}</p></div>
      <div className="result-actions"><button className="primary-action" type="button" onClick={onRetake}><span>再测一次</span><span className="action-arrow">↗</span></button><button className="text-action" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到结果顶部 ↑</button></div>
    </section>
  );
}
