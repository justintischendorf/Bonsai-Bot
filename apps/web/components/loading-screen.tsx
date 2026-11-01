"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { BonsaiLogo } from "@/components/bonsai-logo";

const SEEN_KEY = "loading-screen-seen";
const FINISH_MS = 300;

function readSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

export function resetLoadingScreen() {
  try {
    sessionStorage.removeItem(SEEN_KEY);
  } catch {}
}

export function LoadingScreen({
  ready,
  children,
  message = "Nur noch einen kleinen Moment...",
  minDurationMs = 3000,
}: {
  ready: boolean;
  children: React.ReactNode;
  message?: string;
  minDurationMs?: number;
}) {
  const seen = useSyncExternalStore(
    () => () => {},
    readSeen,
    () => null,
  );

  const [progress, setProgress] = useState(0);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [finished, setFinished] = useState(false);

  const done = minDelayDone && ready;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(0.9));
    const timeout = setTimeout(() => {
      setMinDelayDone(true);
      setProgress(0.98);
    }, minDurationMs);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [minDurationMs]);

  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => {
      markSeen();
      setFinished(true);
    }, FINISH_MS);
    return () => clearTimeout(timeout);
  }, [done]);

  const showContent = seen === true || finished;
  const showLoader = seen === false && !finished;

  const value = done ? 1 : progress;
  const transitionMs = done
    ? FINISH_MS
    : progress < 0.95
      ? minDurationMs
      : 20000;

  return (
    <>
      {showLoader && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-1 flex-col items-center justify-center gap-6 p-6"
        >
          <BonsaiLogo className="size-24" />

          <div className="flex w-56 flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">{message}</p>

            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-full bg-positive"
                style={{
                  transform: `scaleX(${value})`,
                  transition: `transform ${transitionMs}ms ease-out`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      <div hidden={!showContent} className="contents">
        {children}
      </div>
    </>
  );
}
