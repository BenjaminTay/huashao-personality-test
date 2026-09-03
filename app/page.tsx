"use client";

import { useEffect, useRef, useState } from "react";
import { ACTS, QUESTIONS } from "../data/questions";
import type { ArchetypeId, OptionId } from "../data/types";
import type { QuizAnswers as AnswerMap, QuizResult as ComputedResult } from "../data/types";
import { calculateResult } from "../lib/scoring";
import {
  trackTestComplete,
  trackTestStart,
} from "../lib/analytics";
import { ResultPreviewBar } from "../components/result-preview-bar";
import { HomeScreen } from "../components/screens/home-screen";
import { QuizScreen } from "../components/screens/quiz-screen";
import { ActScreen, buildObserverLog } from "../components/screens/act-screen";
import { LoadingScreen } from "../components/screens/loading-screen";
import { RevealScreen } from "../components/screens/reveal-screen";
import { ResultScreen } from "../components/screens/result-screen";
import {
  buildTypeAnswers,
  HOME_SUBTITLES,
  LEGACY_STORAGE_KEY,
  LOADING_LINES,
  readSession,
  STORAGE_KEY,
  type Screen,
} from "../components/screens/quiz-session";

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
  const [bootStuck, setBootStuck] = useState(false);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setBootStuck(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hydrated) {
    return (
      <div className="boot-screen">
        <p>正在打开档案……</p>
        {bootStuck && (
          <button
            className="boot-reload"
            type="button"
            onClick={() => window.location.reload()}
          >
            一直没有加载出来？点我刷新 →
          </button>
        )}
      </div>
    );
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
          <ActScreen
            act={currentAct}
            observerLog={
              currentAct.act === 1
                ? null
                : buildObserverLog(answers, (currentAct.act - 1) as 1 | 2 | 3)
            }
            onContinue={() => setScreen("quiz")}
            onHome={goHome}
          />
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
