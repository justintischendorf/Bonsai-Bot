import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export const wishlistSuggestionQueryKey = ["wishlist-suggestion"];
export const wishlistSuggestionQueryFn = () =>
  apiClient.api.wishlist.suggestion.get();
export function useWishlistSuggestion() {
  return useQuery({
    queryKey: wishlistSuggestionQueryKey,
    queryFn: wishlistSuggestionQueryFn,
  });
}
