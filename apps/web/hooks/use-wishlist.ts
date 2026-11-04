import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export const wishlistQueryKey = ["wishlist"];
export const wishlistQueryFn = () => apiClient.api.wishlist.get();
export function useWishlist() {
  return useQuery({
    queryKey: wishlistQueryKey,
    queryFn: wishlistQueryFn,
  });
}
