import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { musicQueueQueryKey, useMusicQueue } from "@/hooks/use-music-queue";
import { cn } from "@/lib/utils";
import { apiClient } from "@repo/api-client";

import LoadingSpinner from "./loading-spinner";
import { formatDuration } from "./music-queue";
import SongCover from "./song-cover";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { toast } from "./ui/toast";

const buttonStyles =
  "flex-1 transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30 sm:flex-none";

export default function BonsaiFMPlayer({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: musicResponse, dataUpdatedAt } = useMusicQueue();
  const playback = musicResponse?.data?.server;
  const song = playback?.current ?? null;
  const isConnected = playback?.connected ?? false;
  const isPlaying = Boolean(song) && !playback?.paused;

  // Meldet nur neue Fehler, nicht den Stand, der beim Öffnen der Seite schon vorlag.
  const lastFailure = playback?.lastFailure;
  const seenFailureAt = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (playback === undefined) return;
    const failureAt = lastFailure?.at ?? null;
    if (
      seenFailureAt.current !== undefined &&
      failureAt !== null &&
      failureAt !== seenFailureAt.current
    ) {
      toast.add({
        title: "Song konnte nicht abgespielt werden",
        description: `„${lastFailure?.title}“ wurde übersprungen.`,
      });
    }
    seenFailureAt.current = failureAt;
  }, [playback, lastFailure]);

  // Zwischen zwei Abfragen läuft die Anzeige lokal weiter, damit der Fortschritt nicht springt.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const sinceUpdate = isPlaying
    ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000))
    : 0;
  const elapsed = song
    ? Math.min((playback?.position ?? 0) + sinceUpdate, song.duration)
    : 0;

  const { mutateAsync: togglePlayback, isPending: isTogglingPlayback } =
    useMutation({
      mutationFn: async (shouldPlay: boolean) => {
        return shouldPlay
          ? apiClient.api.music.play.post()
          : apiClient.api.music.stop.post();
      },
    });

  const { mutateAsync: skipSong, isPending: isSkippingSong } = useMutation({
    mutationFn: async () => apiClient.api.music.skip.post(),
  });

  async function handleTogglePlayback() {
    const shouldPlay = !isPlaying;
    const { error } = await togglePlayback(shouldPlay);

    if (error) {
      toast.add({
        title: shouldPlay
          ? "Fehler beim Abspielen der Musik"
          : "Fehler beim Pausieren der Musik",
        description: (error.value as { message: string }).message,
      });
    }
    await queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
  }

  async function handleSkipSong() {
    const { error } = await skipSong();

    if (error) {
      toast.add({
        title: "Fehler beim Überspringen des Songs",
        description: (error.value as { message: string }).message,
      });
    }
    await queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
  }

  function getStatusText() {
    if (!song) return isConnected ? "Bereit" : "Keine Jam aktiv";
    return isPlaying ? "Läuft gerade" : "Pausiert";
  }

  return (
    <section
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-4 self-start rounded-xl border border-accent p-4 max-sm:w-full sm:gap-6 sm:rounded-none sm:border-0 sm:p-0",
        className,
      )}
    >
      <SongCover
        artworkUrl={song?.artworkUrl}
        label={song ? `Cover von ${song.title}` : "Kein Song aktiv"}
        sizes="(min-width: 1024px) 288px, (min-width: 640px) 224px, 128px"
        loading="eager"
        className="size-32 self-center rounded-lg bg-linear-to-br from-bonsai-leaf to-bonsai-face sm:size-56 lg:size-72"
        iconClassName="size-10 text-bonsai-pot-light"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="min-w-0 text-center">
          <p className="text-xs text-muted-foreground">{getStatusText()}</p>
          <h2 className="truncate text-xl font-semibold lg:text-3xl">
            {song?.title ?? "Kein Song"}
          </h2>
          <p className="truncate text-sm font-medium text-muted-foreground">
            {song?.artist ?? "Füge Songs zur Warteschlange hinzu"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Progress
            aria-label="Songfortschritt"
            // Ohne feste Sprache formatieren Server und Browser den Wert unterschiedlich ("0%" und "0 %").
            locale="de-DE"
            value={
              song && song.duration > 0 ? (elapsed / song.duration) * 100 : 0
            }
            className="**:data-[slot=progress-indicator]:bg-bonsai-leaf-light"
          />
          <div className="flex justify-between text-xs font-medium text-muted-foreground tabular-nums">
            <span>{formatDuration(elapsed)}</span>
            <span>{formatDuration(song?.duration ?? 0)}</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            className={buttonStyles}
            variant="outline"
            type="button"
            disabled={isTogglingPlayback || !isConnected}
            onClick={handleTogglePlayback}
          >
            {isTogglingPlayback ? (
              <LoadingSpinner />
            ) : isPlaying ? (
              <>
                <Pause />
                Pause
              </>
            ) : (
              <>
                <Play />
                Abspielen
              </>
            )}
          </Button>
          <Button
            className={buttonStyles}
            variant="outline"
            type="button"
            disabled={isSkippingSong || !song}
            onClick={handleSkipSong}
          >
            {isSkippingSong ? (
              <LoadingSpinner />
            ) : (
              <>
                <SkipForward />
                Überspringen
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
