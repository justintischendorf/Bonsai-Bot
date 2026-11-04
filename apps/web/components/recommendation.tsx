import { MoveRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export default function Recommendation({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "flex w-full flex-col justify-center rounded-xl border p-3 sm:w-1/4",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">Heutige Empfehlung</p>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-sm font-semibold">Minecraft</h2>
        <span className="shrink-0 text-xs font-medium text-bonsai-leaf-light">
          13,99 €
        </span>
      </div>
      <Link
        href="https://store.steampowered.com"
        className="group flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
      >
        Zu Steam
        <MoveRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </article>
  );
}
