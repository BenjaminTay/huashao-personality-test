import { ARCHETYPES } from "../data/archetypes";
import type { ArchetypeId } from "../data/types";

const GOATCOUNTER_SITE = process.env.NEXT_PUBLIC_GOATCOUNTER_SITE;

interface GoatCounterVars {
  event?: boolean;
  path?: string;
  title?: string;
  no_session?: 1;
}

declare global {
  interface Window {
    goatcounter?: { count?: (vars: GoatCounterVars) => void };
  }
}

let testStartedAt: number | null = null;

const pendingEvents: GoatCounterVars[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function flushPendingEvents() {
  const count = window.goatcounter?.count;
  if (!count) return;
  for (const event of pendingEvents.splice(0)) {
    try {
      count(event);
    } catch {
      // Analytics must never interrupt the quiz.
    }
  }
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

function send(vars: GoatCounterVars): void {
  if (!GOATCOUNTER_SITE || typeof window === "undefined") return;
  pendingEvents.push(vars);
  flushPendingEvents();
  if (!flushTimer) {
    flushTimer = setInterval(flushPendingEvents, 200);
  }
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

export function trackTestStart(): void {
  testStartedAt = Date.now();
  send({ event: true, path: "start-test", no_session: 1 });
}

export function trackTestComplete(primaryType: ArchetypeId): void {
  const title =
    testStartedAt !== null
      ? `${ARCHETYPES[primaryType].personName} · 用时 ${formatDuration(
          Math.max(0, Math.round((Date.now() - testStartedAt) / 1000)),
        )}`
      : ARCHETYPES[primaryType].personName;
  send({ event: true, path: `complete-${primaryType}`, title, no_session: 1 });
}

export function trackShareCard(): void {
  send({ event: true, path: "share-download", no_session: 1 });
}
