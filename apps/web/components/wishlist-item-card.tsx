import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoveRight, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { wishlistQueryKey, type WishlistItem } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { apiClient } from "@repo/api-client";

import { toast } from "./ui/toast";

const DESCRIPTION_PREVIEW_LENGTH = 120;

export default function WishlistItemCard({
  item,
  className,
}: {
  item: WishlistItem;
  className?: string;
}) {
  const queryClient = useQueryClient();

  const shops = [
    {
      name: "Steam",
      link: item.steamLink,
      price: item.steamPrice,
      isLinkBroken: item.steamLinkBroken,
    },
    {
      name: "Instant Gaming",
      link: item.instantGamingLink,
      price: item.instantGamingPrice,
      isLinkBroken: item.instantGamingLinkBroken,
    },
  ];

  const { mutateAsync: removeWishlistItem } = useMutation({
    mutationFn: async (input: { id: number }) => {
      return apiClient.api.wishlist(input).delete();
    },
  });

  async function handleRemoveWishlistItem(id: number) {
    const { error: removeWishlistItemError } = await removeWishlistItem({ id });

    if (removeWishlistItemError) {
      toast.add({
        title:
          removeWishlistItemError.status + " Fehler beim Entfernen des Spiels",
        description: removeWishlistItemError.value.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: wishlistQueryKey });

    toast.add({
      title: `${item.name} erfolgreich entfernt`,
      description: "Das Spiel wurde von der Wunschliste entfernt.",
    });
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-accent p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{item.name}</h2>
          {item.releaseDate && (
            <p className="truncate text-sm text-muted-foreground">
              Release: {item.releaseDate}
            </p>
          )}
          <p className="truncate text-sm text-muted-foreground">
            Hinzugefügt von {item.createdBy}
          </p>
        </div>
        <Button
          className="text-muted-foreground transition-colors duration-300 hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleRemoveWishlistItem(item.id);
          }}
          aria-label={`${item.name} von der Wunschliste entfernen`}
        >
          <Trash2 />
        </Button>
      </div>
      {item.description.length > DESCRIPTION_PREVIEW_LENGTH ? (
        <div className="flex flex-col items-start gap-1">
          <p className="line-clamp-3 text-sm leading-relaxed text-bonsai-pot">
            {item.description}
          </p>
          <Dialog>
            <DialogTrigger
              render={
                <button
                  className="cursor-pointer py-1 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
                  type="button"
                  aria-label={`Mehr anzeigen: Beschreibung von ${item.name}`}
                >
                  Mehr anzeigen
                </button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="pr-8 leading-snug">
                  {item.name}
                </DialogTitle>
                <DialogDescription className="max-h-[60vh] overflow-y-auto leading-relaxed">
                  {item.description}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground empty:hidden">
          {item.description}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-1">
        {shops.map(
          ({ name, link, price, isLinkBroken }) =>
            link && (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={link}
                    className="group -my-0.5 flex w-fit items-center gap-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
                  >
                    {name}
                    <MoveRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  {price !== null && (
                    <span className="shrink-0 text-sm font-medium text-bonsai-leaf-light">
                      {price} €
                    </span>
                  )}
                </div>
                {isLinkBroken && (
                  <p className="flex items-start gap-1 text-xs text-amber-500">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    Link konnte zuletzt nicht gelesen werden, der Preis ist
                    vielleicht veraltet.
                  </p>
                )}
              </div>
            ),
        )}
      </div>
    </article>
  );
}

export function WishlistItemCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="size-7 shrink-0" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}
