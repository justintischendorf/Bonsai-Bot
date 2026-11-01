import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export const serverInfoQueryKey = ["server-info"];
export const serverInfoQueryFn = () => apiClient.api.server.info.get();

export function useServerInfo() {
  return useQuery({
    queryKey: serverInfoQueryKey,
    queryFn: serverInfoQueryFn,
  });
}
