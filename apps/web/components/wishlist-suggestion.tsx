import { MoveRight } from "lucide-react";
import Link from "next/link";

import { useWishlistSuggestion } from "@/hooks/use-wishlist-suggestion";
import { cn } from "@/lib/utils";

import GameCover from "./game-cover";
import { InstantGamingLogo, PlayStationLogo, SteamLogo } from "./shop-logos";

export default function WishlistSuggestion({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const { data: wishlistSuggestionResponse } = useWishlistSuggestion();
  const wishlistSuggestion = wishlistSuggestionResponse?.data?.server;

  if (!wishlistSuggestion) return null;

  const shops = [
    {
      name: "Steam",
      Logo: SteamLogo,
      link: wishlistSuggestion.steamLink,
      price: wishlistSuggestion.steamPrice,
    },
    {
      name: "Instant Gaming",
      Logo: InstantGamingLogo,
      link: wishlistSuggestion.instantGamingLink,
      price: wishlistSuggestion.instantGamingPrice,
    },
    {
      name: "PlayStation Store",
      Logo: PlayStationLogo,
      link: wishlistSuggestion.playstationLink,
      price: wishlistSuggestion.playstationPrice,
    },
  ];

  return (
    <article
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl border p-3 sm:w-1/2 lg:w-1/4",
        href && "transition-colors duration-300 hover:border-bonsai-leaf-light",
        className,
      )}
    >
      {href && (
        <Link
          href={href}
          aria-label="Zur Wunschliste"
          className="absolute inset-0 rounded-xl"
        />
      )}
      <GameCover
        imageUrl={wishlistSuggestion.imageUrl}
        label={`Titelbild von ${wishlistSuggestion.name}`}
        sizes="92px"
        loading="eager"
        className="h-13 rounded-md"
        iconClassName="size-5"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-xs text-muted-foreground">Heutige Empfehlung</p>
        <h2 className="truncate text-sm font-semibold">
          {wishlistSuggestion.name}
        </h2>
        {shops.map(
          ({ name, Logo, link, price }) =>
            link && (
              <div
                key={name}
                className="flex items-baseline justify-between gap-2"
              >
                <Link
                  href={link}
                  className="group relative z-10 -my-0.5 flex w-fit items-center gap-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
                >
                  <Logo className="size-3 shrink-0" />
                  {name}
                  <MoveRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                {price != null && (
                  <span className="shrink-0 text-xs font-medium text-bonsai-leaf-light">
                    {price} €
                  </span>
                )}
              </div>
            ),
        )}
      </div>
    </article>
  );
}
