import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@repo/api-client";

export const wishlistSuggestionQueryKey = ["wishlist-suggestion"];
export const wishlistSuggestionQueryFn = () =>
  apiClient.api.wishlist.suggestion.get();
export function useWishlistSuggestion() {
  return useQuery({
    queryKey: wishlistSuggestionQueryKey,
    queryFn: wishlistSuggestionQueryFn,
  });
}
