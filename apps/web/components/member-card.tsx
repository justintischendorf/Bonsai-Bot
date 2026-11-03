import { type Member } from "@/hooks/use-discord-member-info";
import { cn } from "@/lib/utils";

import { MemberAvatar } from "./member-avatar";
import { Skeleton } from "./ui/skeleton";

export default function MemberCard({
  member,
  className,
}: {
  member: Member;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-accent p-3 sm:w-70",
        className,
      )}
    >
      <MemberAvatar member={member} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="max-w-3/5 shrink-0 truncate text-sm font-semibold">
            {member.name}
          </h2>
          <span
            className={`truncate text-xs font-medium ${
              member.online ? "text-bonsai-leaf-light" : "text-muted-foreground"
            }`}
          >
            {member.game
              ? `Spielt ${member.game}`
              : member.online
                ? "Online"
                : "Offline"}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          @{member.username}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dabei seit{" "}
          {new Date(member.joinedAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
      </div>
    </article>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl p-3 sm:w-70">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}
