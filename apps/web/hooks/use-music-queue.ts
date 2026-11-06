import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

const MUSIC_POLL_INTERVAL_MS = 3_000;

export const musicQueueQueryKey = ["music-queue"];
export const musicQueueQueryFn = () => apiClient.api.music.get();
export type MusicQueueResponse = Awaited<ReturnType<typeof musicQueueQueryFn>>;
export function useMusicQueue() {
  return useQuery({
    queryKey: musicQueueQueryKey,
    queryFn: musicQueueQueryFn,
    refetchInterval: MUSIC_POLL_INTERVAL_MS,
  });
}
