import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Treaty } from "@repo/treaty";

export const wishlistQueryKey = ["wishlist"];
export const wishlistQueryFn = () => apiClient.api.wishlist.get();

export type WishlistItem = Treaty.Data<
  typeof wishlistQueryFn
>["server"][number];

export function useWishlist() {
  return useQuery({
    queryKey: wishlistQueryKey,
    queryFn: wishlistQueryFn,
  });
}
