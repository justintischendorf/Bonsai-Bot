"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SkipForward, TvMinimalPlay } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  type WatchQueueResponse,
  applyWatchState,
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

const TICK_MS = 250;
// Offset that gets corrected right away when someone else changed the playback.
const REMOTE_SYNC_TOLERANCE_S = 0.75;
// Offset that gets corrected while everyone just keeps watching.
const DRIFT_TOLERANCE_S = 1;
const DRIFT_COOLDOWN_MS = 5_000;
// Jump in the player time that playback alone can't explain, so the user seeked.
const SEEK_DETECTION_S = 1.5;
// Player events right after our own commands are not user input.
const OWN_COMMAND_GRACE_MS = 1_000;

type PlaybackAction = "play" | "pause" | "seek";

type Remote = {
  currentId: number | null;
  videoId: string | null;
  paused: boolean;
  position: number;
  version: number;
  receivedAt: number;
};

type Sample = { time: number; at: number; playing: boolean };

const buttonStyles =
  "transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30";

const ERROR_TITLES: Record<PlaybackAction, string> = {
  play: "Fehler beim Abspielen des Videos",
  pause: "Fehler beim Pausieren des Videos",
  seek: "Fehler beim Springen im Video",
};

function getExpectedPosition(remote: Remote) {
  if (remote.paused) return remote.position;
  return remote.position + (Date.now() - remote.receivedAt) / 1000;
}

function isPlayingState(playerState: YT.PlayerState) {
  return (
    playerState === YT.PlayerState.PLAYING ||
    playerState === YT.PlayerState.BUFFERING
  );
}

export default function WatchPlayer({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: watchResponse, isLoading: isWatchQueueLoading } =
    useWatchQueue();
  const state = watchResponse?.data?.server;
  const current = state?.current ?? null;

  const playerRef = useRef<YT.Player | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const remote = useRef<Remote | null>(null);
  const sample = useRef<Sample | null>(null);
  const hasPlayed = useRef(false);
  const ignoreEventsUntil = useRef(0);
  const lastDriftFix = useRef(0);
  const requestChain = useRef<Promise<void>>(Promise.resolve());

  const { mutateAsync: skipVideo, isPending: isSkippingVideo } = useMutation({
    mutationFn: async (currentId: number) =>
      apiClient.api.watch.skip.post({ currentId }),
  });

  function getSyncedPlayer() {
    const player = playerRef.current;
    const target = remote.current;
    if (!player || !target?.videoId) return null;
    if (player.getVideoData().video_id !== target.videoId) return null;
    return { player, target };
  }

  function command(run: () => void) {
    ignoreEventsUntil.current = Date.now() + OWN_COMMAND_GRACE_MS;
    sample.current = null;
    run();
  }

  // Brings the local player to the shared state after it changed or the player became ready.
  function applyRemote() {
    const synced = getSyncedPlayer();
    if (!synced) return;
    const { player, target } = synced;

    const playerState = player.getPlayerState();
    const expected = getExpectedPosition(target);
    const isOff =
      Math.abs(player.getCurrentTime() - expected) > REMOTE_SYNC_TOLERANCE_S;

    if (target.paused) {
      // Seeking a cued video would start it, it gets positioned on the first play instead.
      if (
        playerState === YT.PlayerState.UNSTARTED ||
        playerState === YT.PlayerState.CUED
      ) {
        return;
      }
      if (isPlayingState(playerState)) command(() => player.pauseVideo());
      if (isOff) command(() => player.seekTo(expected, true));
      return;
    }

    if (isOff) command(() => player.seekTo(expected, true));
    if (!isPlayingState(playerState)) command(() => player.playVideo());
  }

  useEffect(() => {
    if (!state) return;
    const previous = remote.current;
    if (previous && previous.version >= state.version) return;

    const currentId = state.current?.id ?? null;
    if (previous?.currentId !== currentId) {
      hasPlayed.current = false;
      sample.current = null;
    }
    remote.current = {
      currentId,
      videoId: state.current?.videoId ?? null,
      paused: state.paused,
      position: state.position,
      version: state.version,
      receivedAt: Date.now(),
    };
    applyRemote();
  }, [state]);

  useEffect(() => {
    applyRemote();
  }, [readyCount]);

  function sendPlayback(action: PlaybackAction, position: number) {
    const target = remote.current;
    if (!target?.currentId) return;

    const paused = action === "seek" ? target.paused : action === "pause";
    remote.current = { ...target, paused, position, receivedAt: Date.now() };
    queryClient.setQueryData<WatchQueueResponse>(watchQueueQueryKey, (old) =>
      old?.data
        ? {
            ...old,
            data: {
              ...old.data,
              server: { ...old.data.server, paused, position },
            },
          }
        : old,
    );

    // Sent one after another so the server sees them in the order they happened.
    requestChain.current = requestChain.current.then(async () => {
      const { data, error } = await apiClient.api.watch[action].post({
        position,
      });
      if (data) {
        applyWatchState(queryClient, data.server);
        return;
      }
      toast.add({
        title: ERROR_TITLES[action],
        description: (error?.value as { message: string } | undefined)?.message,
      });
      // Let the next server state replace the optimistic one.
      if (remote.current) remote.current.version = -Infinity;
      await queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
    });
  }

  // Seeks don't reliably fire player events, so the player time gets watched for jumps.
  function tick() {
    const synced = getSyncedPlayer();
    if (!synced) return;
    const { player, target } = synced;

    const now = Date.now();
    const playerState = player.getPlayerState();
    const time = player.getCurrentTime();
    const previous = sample.current;
    sample.current = {
      time,
      at: now,
      playing: playerState === YT.PlayerState.PLAYING,
    };
    if (now < ignoreEventsUntil.current) return;

    const expected = getExpectedPosition(target);

    if (previous) {
      const maxAdvance = previous.playing
        ? ((now - previous.at) / 1000) * player.getPlaybackRate()
        : 0;
      const jumped =
        time < previous.time - SEEK_DETECTION_S ||
        time > previous.time + maxAdvance + SEEK_DETECTION_S;
      if (jumped && Math.abs(time - expected) > DRIFT_TOLERANCE_S) {
        sendPlayback("seek", time);
        return;
      }
    }

    // Catches play/pause changes whose event fell into a grace period.
    if (playerState === YT.PlayerState.PAUSED && !target.paused) {
      if (hasPlayed.current) sendPlayback("pause", time);
      return;
    }
    if (playerState === YT.PlayerState.PLAYING && target.paused) {
      handleLocalPlay(time);
      return;
    }

    if (
      playerState === YT.PlayerState.PLAYING &&
      Math.abs(time - expected) > DRIFT_TOLERANCE_S &&
      now - lastDriftFix.current > DRIFT_COOLDOWN_MS
    ) {
      lastDriftFix.current = now;
      command(() => player.seekTo(expected, true));
    }
  }

  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });
  useEffect(() => {
    const interval = setInterval(() => tickRef.current(), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleSkipVideo(currentId: number) {
    const { data, error } = await skipVideo(currentId);

    if (data) {
      applyWatchState(queryClient, data.server);
      return;
    }
    toast.add({
      title: "Fehler beim Überspringen des Videos",
      description: (error?.value as { message: string } | undefined)?.message,
    });
    await queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
  }

  // A fresh player starts at 0, its first play continues at the shared position instead.
  function handleLocalPlay(time: number) {
    const synced = getSyncedPlayer();
    if (!synced) return;
    const { player, target } = synced;

    if (
      !hasPlayed.current &&
      Math.abs(time - target.position) > REMOTE_SYNC_TOLERANCE_S
    ) {
      command(() => player.seekTo(target.position, true));
      time = target.position;
    }
    hasPlayed.current = true;
    sendPlayback("play", time);
  }

  function handleStateChange(playerState: YT.PlayerState) {
    const synced = getSyncedPlayer();
    if (!synced) return;
    const { player, target } = synced;

    if (playerState === YT.PlayerState.ENDED) {
      if (target.currentId !== null) handleSkipVideo(target.currentId);
      return;
    }
    if (playerState === YT.PlayerState.CUED) {
      applyRemote();
      return;
    }
    if (Date.now() < ignoreEventsUntil.current) {
      if (playerState === YT.PlayerState.PLAYING) hasPlayed.current = true;
      return;
    }

    const time = player.getCurrentTime();
    if (playerState === YT.PlayerState.PLAYING) {
      if (target.paused) handleLocalPlay(time);
      else hasPlayed.current = true;
      return;
    }
    if (
      playerState === YT.PlayerState.PAUSED &&
      !target.paused &&
      hasPlayed.current
    ) {
      sendPlayback("pause", time);
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
