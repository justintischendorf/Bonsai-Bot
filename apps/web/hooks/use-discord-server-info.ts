import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export const discordServerInfoQueryKey = ["discord-server-info"];
export const discordServerInfoQueryFn = () => apiClient.api.discord.info.get();
export function useDiscordServerInfo() {
  return useQuery({
    queryKey: discordServerInfoQueryKey,
    queryFn: discordServerInfoQueryFn,
  });
}
