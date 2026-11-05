import { MoveRight } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useWishlistSuggestion } from "@/hooks/use-wishlist-suggestion";
import { cn } from "@/lib/utils";

export default function WishlistSuggestion({
  className,
}: {
  className?: string;
}) {
  const {
    data: wishlistSuggestionResponse,
    isLoading: isWishlistSuggestionLoading,
  } = useWishlistSuggestion();
  const wishlistSuggestion = wishlistSuggestionResponse?.data?.server;

  const shops = [
    {
      name: "Steam",
      link: wishlistSuggestion?.steamLink,
      price: wishlistSuggestion?.steamPrice,
    },
    {
      name: "Instant Gaming",
      link: wishlistSuggestion?.instantGamingLink,
      price: wishlistSuggestion?.instantGamingPrice,
    },
  ];

  return (
    <article
      className={cn(
        "flex w-full flex-col justify-center rounded-xl border p-3 sm:w-1/2 lg:w-1/4",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">Heutige Empfehlung</p>
      {isWishlistSuggestionLoading ? (
        <>
          <Skeleton className="my-0.5 h-4 w-2/3" />
          {shops.map(({ name }) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <Skeleton className="my-0.5 h-3 w-24" />
              <Skeleton className="my-0.5 h-3 w-12 shrink-0" />
            </div>
          ))}
        </>
      ) : wishlistSuggestion ? (
        <>
          <h2 className="truncate text-sm font-semibold">
            {wishlistSuggestion.name}
          </h2>
          {shops.map(
            ({ name, link, price }) =>
              link && (
                <div
                  key={name}
                  className="flex items-baseline justify-between gap-2"
                >
                  <Link
                    href={link}
                    className="group -my-0.5 flex w-fit items-center gap-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors duration-300 hover:text-bonsai-leaf-light"
                  >
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aktuell keine Empfehlung verfügbar
        </p>
      )}
    </article>
  );
}
