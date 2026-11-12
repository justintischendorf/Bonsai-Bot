import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeX,
  CircleCheckBig,
  MoveRight,
  ThumbsUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import React from "react";

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
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { ConfirmAlert } from "./confirm-alert";
import GameCover from "./game-cover";
import { InstantGamingLogo, PlayStationLogo, SteamLogo } from "./shop-logos";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { toast } from "./ui/toast";

const DESCRIPTION_PREVIEW_LENGTH = 120;
const MAX_VISIBLE_LIKES = 9;

export default function WishlistItemCard({
  item,
  imageLoading,
  className,
}: {
  item: WishlistItem;
  imageLoading?: "eager" | "lazy";
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUser = session?.user;
  const otherLikes = item.likes.filter(({ id }) => id !== currentUser?.id);
  const visibleLikes = otherLikes.slice(0, MAX_VISIBLE_LIKES);
  const [showRemoveWishlistConfirm, setShowRemoveWishlistConfirm] =
    React.useState(false);

  const shops = [
    {
      name: "Steam",
      Logo: SteamLogo,
      link: item.steamLink,
      price: item.steamPrice,
      isLinkBroken: item.steamLinkBroken,
    },
    {
      name: "Instant Gaming",
      Logo: InstantGamingLogo,
      link: item.instantGamingLink,
      price: item.instantGamingPrice,
      isLinkBroken: item.instantGamingLinkBroken,
    },
    {
      name: "PlayStation Store",
      Logo: PlayStationLogo,
      link: item.playstationLink,
      price: item.playstationPrice,
      isLinkBroken: item.playstationLinkBroken,
    },
  ];

  const { mutateAsync: removeWishlistItem } = useMutation({
    mutationFn: async (input: { id: number }) => {
      return apiClient.api.wishlist(input).delete();
    },
  });

  const { mutateAsync: setWishlistItemLike } = useMutation({
    mutationFn: async (input: { id: number; liked: boolean }) => {
      return apiClient.api
        .wishlist({ id: input.id })
        .like.patch({ liked: input.liked });
    },
  });

  async function handleToggleLike() {
    const liked = !item.likedByMe;
    const { error: setLikeError } = await setWishlistItemLike({
      id: item.id,
      liked,
    });

    if (setLikeError) {
      toast.add({
        title:
          setLikeError.status +
          (liked
            ? " Fehler beim Liken des Spiels"
            : " Fehler beim Entfernen des Likes"),
        description: setLikeError.value.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
  }

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
        "flex flex-col gap-2.5 rounded-xl border border-accent p-3",
        className,
      )}
    >
      <GameCover
        imageUrl={item.imageUrl}
        label={`Titelbild von ${item.name}`}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        loading={imageLoading}
        className="w-full rounded-md mb-2"
        iconClassName="size-8"
      />
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
          <div className="flex gap-2 items-center">
            <p className="text-sm">Crossplay</p>
            {item.crossplayAvailable ? (
              <CircleCheckBig className="size-5 text-bonsai-leaf-light" />
            ) : (
              <BadgeX className="size-5 text-destructive" />
            )}
          </div>
        </div>
        <div className="flex">
          <HoverCard>
            <HoverCardTrigger
              delay={10}
              closeDelay={100}
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  type="button"
                  aria-label={`${item.name} gefällt mir`}
                  aria-pressed={item.likedByMe}
                  className={cn(
                    "relative text-muted-foreground transition-colors duration-300 hover:bg-bonsai-leaf-light/10 hover:text-bonsai-leaf-light data-popup-open:text-bonsai-leaf-light dark:hover:bg-bonsai-leaf-light/15",
                    item.likedByMe && "text-bonsai-leaf-light",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleLike();
                  }}
                >
                  <span className="text-xs absolute -top-3 -right-1 bg-bonsai-leaf-light rounded-full w-4 h-4 text-background flex items-center justify-center">
                    {item.likes?.length ?? 0}
                  </span>
                  <ThumbsUp />
                </Button>
              }
            />
            <HoverCardContent
              align="end"
              className="flex w-60 flex-col gap-3 rounded-xl border border-foreground/10 bg-background p-3 shadow-lg ring-0"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ThumbsUp className="size-4 text-bonsai-leaf-light" />
                Gefällt außerdem
              </p>
              {visibleLikes.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {visibleLikes.map((user) => (
                    <li
                      key={user.id}
                      className="flex max-w-full items-center gap-1.5 rounded-full border border-accent py-0.5 pr-2.5 pl-0.5 text-xs font-medium text-bonsai-pot"
                    >
                      <Avatar size="sm" className="size-5">
                        <AvatarImage src={user.image ?? undefined} alt="" />
                        <AvatarFallback className="text-[0.625rem]">
                          {[...user.name][0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{user.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Bisher noch niemandem.
                </p>
              )}
            </HoverCardContent>
          </HoverCard>

          <Button
            className="text-muted-foreground transition-colors duration-300 hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowRemoveWishlistConfirm(true);
            }}
            aria-label={`${item.name} von der Wunschliste entfernen`}
          >
            <Trash2 />
          </Button>
        </div>
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
          ({ name, Logo, link, price, isLinkBroken }) =>
            link && (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={link}
                    className="group -my-0.5 flex w-fit items-center gap-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
                  >
                    <Logo className="size-3.5 shrink-0" />
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
      <ConfirmAlert
        message={`Möchtest du ${item.name} aus der Wunschliste entfernen?`}
        open={showRemoveWishlistConfirm}
        onOpenChange={setShowRemoveWishlistConfirm}
        onConfirm={() => handleRemoveWishlistItem(item.id)}
        title="Spiel entfernen?"
      />
    </article>
  );
}

export function WishlistItemCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent p-3">
      <Skeleton className="aspect-616/353 w-full rounded-md" />
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
