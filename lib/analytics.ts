import type { ArchetypeId } from "../data/types";

const GOATCOUNTER_SITE = process.env.NEXT_PUBLIC_GOATCOUNTER_SITE;

interface GoatCounterVars {
  event?: boolean;
  path?: string;
  no_session?: 1;
}

declare global {
  interface Window {
    goatcounter?: { count?: (vars: GoatCounterVars) => void };
  }
}

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

export function trackTestStart(): void {
  send({ event: true, path: "start-test", no_session: 1 });
}

export function trackTestComplete(primaryType: ArchetypeId): void {
  send({ event: true, path: `complete-${primaryType}`, no_session: 1 });
}

export function trackShareCard(): void {
  send({ event: true, path: "share-download", no_session: 1 });
}

export function trackShareImage(): void {
  send({ event: true, path: "share-image", no_session: 1 });
}

export function trackShareForward(): void {
  send({ event: true, path: "share-forward", no_session: 1 });
}

export function trackShareCopy(): void {
  send({ event: true, path: "share-copy", no_session: 1 });
}
