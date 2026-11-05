import { Skeleton } from "@/components/ui/skeleton";
import { useMusicQueue } from "@/hooks/use-music-queue";
import { cn } from "@/lib/utils";

import SongCover from "./song-cover";

export default function NowPlaying({ className }: { className?: string }) {
  const { data: musicResponse, isLoading } = useMusicQueue();
  const playback = musicResponse?.data?.server;
  const song = playback?.current ?? null;

  return (
    <article
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 sm:w-1/2 lg:w-1/4",
        className,
      )}
    >
      {isLoading ? (
        <>
          <Skeleton className="size-13 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="text-xs text-muted-foreground">Läuft gerade</p>
            <Skeleton className="my-0.5 h-4 w-2/3" />
            <Skeleton className="my-0.5 h-3 w-1/2" />
          </div>
        </>
      ) : (
        <>
          <SongCover
            artworkUrl={song?.artworkUrl}
            label={song ? `Cover von ${song.title}` : "Kein Song aktiv"}
            sizes="52px"
            className="size-13 rounded-md bg-muted"
            iconClassName="size-5 text-muted-foreground"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="text-xs text-muted-foreground">
              {song && playback?.paused ? "Pausiert" : "Läuft gerade"}
            </p>
            <h2 className="truncate text-sm font-semibold">
              {song?.title ?? "Kein Song"}
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {song?.artist ??
                (playback?.connected ? "Bereit" : "Keine Jam aktiv")}
            </p>
          </div>
        </>
      )}
    </article>
  );
}
