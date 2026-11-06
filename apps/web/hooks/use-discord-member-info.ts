import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Treaty } from "@repo/treaty";

export const discordMemberInfoQueryKey = ["discord-members-info"];
export const discordMemberInfoQueryFn = () =>
  apiClient.api.discord.members.get();

export type Member = Treaty.Data<
  typeof discordMemberInfoQueryFn
>["members"][number];

export function useDiscordMemberInfo() {
  return useQuery({
    queryKey: discordMemberInfoQueryKey,
    queryFn: discordMemberInfoQueryFn,
    refetchInterval: 30_000,
  });
}
