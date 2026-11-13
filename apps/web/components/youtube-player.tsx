/// <reference types="youtube" />
"use client";

import { type RefObject, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

// Right after a video change the player has no video data yet and returns undefined.
export function getPlayerVideoId(player: YT.Player): string | null {
  return player.getVideoData?.()?.video_id ?? null;
}

function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  });
  return apiPromise;
}

export default function YouTubePlayer({
  videoId,
  playerRef,
  onReady,
  onStateChange,
  onError,
  className,
}: {
  videoId: string;
  playerRef: RefObject<YT.Player | null>;
  onReady?: () => void;
  onStateChange?: (state: YT.PlayerState) => void;
  onError?: (error: YT.PlayerError) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ videoId, onReady, onStateChange, onError });
  useEffect(() => {
    latest.current = { videoId, onReady, onStateChange, onError };
  });

  useEffect(() => {
    let cancelled = false;
    let player: YT.Player | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      const target = document.createElement("div");
      containerRef.current.appendChild(target);
      const initialVideoId = latest.current.videoId;

      player = new YT.Player(target, {
        videoId: initialVideoId,
        width: "100%",
        height: "100%",
        // The origin tells YouTube which site embeds the player.
        playerVars: { rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (cancelled || !player) return;
            playerRef.current = player;
            if (latest.current.videoId !== initialVideoId) {
              player.cueVideoById(latest.current.videoId);
            }
            latest.current.onReady?.();
          },
          onStateChange: (event) => latest.current.onStateChange?.(event.data),
          onError: (event) => latest.current.onError?.(event.data),
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
    };
  }, [playerRef]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || getPlayerVideoId(player) === videoId) return;
    player.cueVideoById(videoId);
  }, [videoId, playerRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "aspect-video w-full overflow-hidden rounded-xl bg-muted [&_iframe]:size-full",
        className,
      )}
    />
  );
}
