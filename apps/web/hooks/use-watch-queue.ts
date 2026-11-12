import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

const WATCH_POLL_INTERVAL_MS = 2_000;

export const watchQueueQueryKey = ["watch-queue"];
export const watchQueueQueryFn = () => apiClient.api.watch.get();
export type WatchQueueResponse = Awaited<ReturnType<typeof watchQueueQueryFn>>;
export type WatchState = NonNullable<WatchQueueResponse["data"]>["server"];
export type QueuedVideo = WatchState["queue"][number];

export function useWatchQueue() {
  return useQuery({
    queryKey: watchQueueQueryKey,
    queryFn: watchQueueQueryFn,
    refetchInterval: WATCH_POLL_INTERVAL_MS,
  });
}
