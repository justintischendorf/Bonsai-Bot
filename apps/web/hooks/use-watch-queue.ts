import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { apiClient } from "@/lib/api-client";

// Changes arrive over the socket, polling only catches up if it was down.
const WATCH_FALLBACK_POLL_INTERVAL_MS = 30_000;
const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 5_000];
// A sync round sends several pings and keeps the fastest answer, it is the most accurate one.
const CLOCK_SYNC_PINGS = 5;
const CLOCK_SYNC_PING_GAP_MS = 150;
const CLOCK_SYNC_INTERVAL_MS = 60_000;

type Pong = { type: "pong"; clientTime: number; serverTime: number };

// Server clock minus local clock, so positions from the server can be advanced without the network delay.
let serverClockOffset: number | null = null;

// Null until the first sync answered, the local clock can be off by seconds.
export function getServerNow() {
  return serverClockOffset === null ? null : Date.now() + serverClockOffset;
}

export const watchQueueQueryKey = ["watch-queue"];
export const watchQueueQueryFn = () => apiClient.api.watch.get();
export type WatchQueueResponse = Awaited<ReturnType<typeof watchQueueQueryFn>>;
export type WatchState = NonNullable<WatchQueueResponse["data"]>["server"];
export type QueuedVideo = WatchState["queue"][number];

function getCachedState(queryClient: QueryClient) {
  return queryClient.getQueryData<WatchQueueResponse>(watchQueueQueryKey)?.data
    ?.server;
}

// Writes the state into the cache unless a newer one is already there.
export function applyWatchState(queryClient: QueryClient, state: WatchState) {
  const cached = getCachedState(queryClient);
  if (!cached || cached.version >= state.version) return;

  queryClient.setQueryData<WatchQueueResponse>(watchQueueQueryKey, (old) =>
    old?.data ? { ...old, data: { ...old.data, server: state } } : old,
  );
}

export function useWatchQueue() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: watchQueueQueryKey,
    queryFn: async () => {
      const response = await watchQueueQueryFn();
      const cached = getCachedState(queryClient);
      const fetched = response.data?.server;
      // A socket message may have overtaken this request.
      if (cached && fetched && cached.version > fetched.version) {
        return queryClient.getQueryData<WatchQueueResponse>(
          watchQueueQueryKey,
        )!;
      }
      return response;
    },
    refetchInterval: WATCH_FALLBACK_POLL_INTERVAL_MS,
  });
}

function getLiveUrl() {
  const base = process.env.NEXT_PUBLIC_API_SERVER_URL!.replace(/\/$/, "");
  return `${base.replace(/^http/, "ws")}/api/watch/live`;
}

// Keeps a socket open that pushes every queue and playback change into the cache.
export function useWatchLive() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let syncTimers: ReturnType<typeof setTimeout>[] = [];
    let syncInterval: ReturnType<typeof setInterval> | undefined;
    let bestRoundTrip = Infinity;
    let attempt = 0;
    let disposed = false;

    function syncClock() {
      syncTimers.forEach(clearTimeout);
      syncTimers = [];
      bestRoundTrip = Infinity;
      for (let i = 0; i < CLOCK_SYNC_PINGS; i++) {
        syncTimers.push(
          setTimeout(() => {
            if (socket?.readyState !== WebSocket.OPEN) return;
            socket.send(
              JSON.stringify({ type: "ping", clientTime: Date.now() }),
            );
          }, i * CLOCK_SYNC_PING_GAP_MS),
        );
      }
    }

    function handlePong({ clientTime, serverTime }: Pong) {
      const roundTrip = Date.now() - clientTime;
      if (roundTrip > bestRoundTrip) return;
      bestRoundTrip = roundTrip;
      // The server answered about halfway through the round trip.
      serverClockOffset = serverTime - (clientTime + roundTrip / 2);
    }

    function stopClockSync() {
      syncTimers.forEach(clearTimeout);
      syncTimers = [];
      clearInterval(syncInterval);
    }

    function connect() {
      socket = new WebSocket(getLiveUrl());
      socket.onopen = () => {
        attempt = 0;
        syncClock();
        syncInterval = setInterval(syncClock, CLOCK_SYNC_INTERVAL_MS);
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as
          | WatchState
          | Pong
          | { type: string };
        if (!("type" in message)) {
          applyWatchState(queryClient, message);
          return;
        }
        // Other typed messages are errors from the server.
        if (message.type === "pong") handlePong(message as Pong);
      };
      socket.onclose = () => {
        stopClockSync();
        if (disposed) return;
        const delay =
          RECONNECT_DELAYS_MS[
            Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)
          ];
        attempt++;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      stopClockSync();
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient]);
}
