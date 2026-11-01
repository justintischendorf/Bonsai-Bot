import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

export const serverMembersQueryKey = ["server-members"];
export const serverMembersQueryFn = () => apiClient.api.server.members.get();

export function useServerMembers() {
  return useQuery({
    queryKey: serverMembersQueryKey,
    queryFn: serverMembersQueryFn,
  });
}
