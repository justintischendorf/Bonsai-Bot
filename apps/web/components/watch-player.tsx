"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SkipForward, TvMinimalPlay } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  type WatchQueueResponse,
  type WatchState,
  useWatchQueue,
  watchQueueQueryKey,
} from "@/hooks/use-watch-queue";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import LoadingSpinner from "./loading-spinner";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toast";
import YouTubePlayer from "./youtube-player";

const SYNC_TOLERANCE_S = 2;
const REMOTE_CHANGE_GRACE_MS = 1_000;

type PlaybackAction = "play" | "pause" | "seek";

const buttonStyles =
  "transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30";

const ERROR_TITLES: Record<PlaybackAction, string> = {
  play: "Fehler beim Abspielen des Videos",
  pause: "Fehler beim Pausieren des Videos",
  seek: "Fehler beim Springen im Video",
};

function getExpectedPosition(state: WatchState, receivedAt: number) {
  if (state.paused) return state.position;
  return state.position + (Date.now() - receivedAt) / 1000;
}

export default function WatchPlayer({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const {
    data: watchResponse,
    dataUpdatedAt,
    isLoading: isWatchQueueLoading,
  } = useWatchQueue();
  const state = watchResponse?.data?.server;
  const current = state?.current ?? null;

  const playerRef = useRef<YT.Player | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const ignoreEventsUntil = useRef(0);
  const wasPlaying = useRef(false);
  const latest = useRef({ state, dataUpdatedAt });
  useEffect(() => {
    latest.current = { state, dataUpdatedAt };
  });

  const { mutateAsync: sendPlayback } = useMutation({
    mutationFn: async ({
      action,
      position,
    }: {
      action: PlaybackAction;
      position: number;
    }) => apiClient.api.watch[action].post({ position }),
  });

  const { mutateAsync: skipVideo, isPending: isSkippingVideo } = useMutation({
    mutationFn: async (currentId: number) =>
      apiClient.api.watch.skip.post({ currentId }),
  });

  function ignorePlayerEvents() {
    ignoreEventsUntil.current = Date.now() + REMOTE_CHANGE_GRACE_MS;
  }

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !state?.current) return;
    if (player.getVideoData().video_id !== state.current.videoId) return;

    const expected = getExpectedPosition(state, dataUpdatedAt);
    const playerState = player.getPlayerState();
    const isPlayingLocally =
      playerState === YT.PlayerState.PLAYING ||
      playerState === YT.PlayerState.BUFFERING;

    if (Math.abs(player.getCurrentTime() - expected) > SYNC_TOLERANCE_S) {
      ignorePlayerEvents();
      player.seekTo(expected, true);
    }
    if (state.paused && isPlayingLocally) {
      ignorePlayerEvents();
      player.pauseVideo();
    }
    if (!state.paused && !isPlayingLocally) {
      ignorePlayerEvents();
      player.playVideo();
    }
  }, [state, dataUpdatedAt, readyCount]);

  async function handlePlayback(action: PlaybackAction, position: number) {
    await queryClient.cancelQueries({ queryKey: watchQueueQueryKey });
    queryClient.setQueryData<WatchQueueResponse>(watchQueueQueryKey, (old) =>
      old?.data
        ? {
            ...old,
            data: {
              ...old.data,
              server: {
                ...old.data.server,
                position,
                paused:
                  action === "seek"
                    ? old.data.server.paused
                    : action === "pause",
              },
            },
          }
        : old,
    );

    const { error } = await sendPlayback({ action, position });
    if (error) {
      toast.add({
        title: ERROR_TITLES[action],
        description: (error.value as { message: string }).message,
      });
    }
    await queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
  }

  async function handleSkipVideo(currentId: number) {
    const { error } = await skipVideo(currentId);

    if (error) {
      toast.add({
        title: "Fehler beim Überspringen des Videos",
        description: (error.value as { message: string }).message,
      });
    }
    await queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
  }

  function handleStateChange(playerState: YT.PlayerState) {
    const player = playerRef.current;
    const { state: serverState, dataUpdatedAt: receivedAt } = latest.current;
    if (!player || !serverState?.current) return;

    if (playerState === YT.PlayerState.ENDED) {
      wasPlaying.current = false;
      handleSkipVideo(serverState.current.id);
      return;
    }
    if (
      playerState !== YT.PlayerState.PLAYING &&
      playerState !== YT.PlayerState.PAUSED
    ) {
      return;
    }

    const startedPlaying =
      playerState === YT.PlayerState.PLAYING && !wasPlaying.current;
    wasPlaying.current = playerState === YT.PlayerState.PLAYING;
    if (Date.now() < ignoreEventsUntil.current) return;

    const position = player.getCurrentTime();
    const isOffSync =
      Math.abs(position - getExpectedPosition(serverState, receivedAt)) >
      SYNC_TOLERANCE_S;

    if (playerState === YT.PlayerState.PAUSED) {
      if (!serverState.paused) handlePlayback("pause", position);
      else if (isOffSync) handlePlayback("seek", position);
      return;
    }

    if (serverState.paused) {
      handlePlayback("play", position);
    } else if (isOffSync && startedPlaying) {
      ignorePlayerEvents();
      player.seekTo(getExpectedPosition(serverState, receivedAt), true);
    } else if (isOffSync) {
      handlePlayback("seek", position);
    }
  }

  return (
    <section className={cn("flex min-w-0 flex-col gap-4 lg:flex-2", className)}>
      {isWatchQueueLoading ? (
        <Skeleton className="aspect-video w-full rounded-xl" />
      ) : current ? (
        <YouTubePlayer
          videoId={current.videoId}
          playerRef={playerRef}
          onReady={() => setReadyCount((count) => count + 1)}
          onStateChange={handleStateChange}
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-linear-to-br from-bonsai-leaf to-bonsai-face p-4 text-center">
          <TvMinimalPlay className="size-10 text-bonsai-pot-light" />
          <p className="text-sm font-medium text-bonsai-pot-light">
            Füge ein Video hinzu, um zusammen zu schauen
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {current
              ? state?.paused
                ? "Pausiert"
                : "Läuft gerade"
              : "Kein Video aktiv"}
          </p>
          <h2 className="line-clamp-2 text-xl font-semibold lg:text-2xl">
            {current?.title ?? "Kein Video"}
          </h2>
          {current && (
            <p className="truncate text-sm font-medium text-muted-foreground">
              {current.channel} · Gewünscht von {current.requestedBy}
            </p>
          )}
        </div>
        <Button
          className={cn(buttonStyles, "shrink-0")}
          variant="outline"
          type="button"
          disabled={isSkippingVideo || !current}
          onClick={() => current && handleSkipVideo(current.id)}
        >
          {isSkippingVideo ? (
            <LoadingSpinner />
          ) : (
            <>
              <SkipForward />
              Überspringen
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
