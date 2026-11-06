import { useMusicQueue } from "@/hooks/use-music-queue";
import { cn } from "@/lib/utils";

import SongCover from "./song-cover";

export default function NowPlaying({ className }: { className?: string }) {
  const { data: musicResponse } = useMusicQueue();
  const playback = musicResponse?.data?.server;
  const song = playback?.current;

  if (!song) return null;

  return (
    <article
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 sm:w-1/2 lg:w-1/4",
        className,
      )}
    >
      <SongCover
        artworkUrl={song.artworkUrl}
        label={`Cover von ${song.title}`}
        sizes="52px"
        className="size-13 rounded-md bg-muted"
        iconClassName="size-5 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-xs text-muted-foreground">
          {playback.paused ? "Pausiert" : "Läuft gerade"}
        </p>
        <h2 className="truncate text-sm font-semibold">{song.title}</h2>
        <p className="truncate text-xs font-medium text-muted-foreground">
          {song.artist}
        </p>
      </div>
    </article>
  );
}
