import { Music } from "lucide-react";

import { cn } from "@/lib/utils";

export default function NowPlaying({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 sm:w-1/4",
        className,
      )}
    >
      <div className="flex size-13 shrink-0 items-center justify-center rounded-md bg-muted">
        <Music className="size-5 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-xs text-muted-foreground">Läuft gerade</p>
        <h2 className="truncate text-sm font-semibold">Title</h2>
        <p className="truncate text-xs font-medium text-muted-foreground">
          Artist
        </p>
      </div>
    </article>
  );
}
