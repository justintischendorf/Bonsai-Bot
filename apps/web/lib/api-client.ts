import { createApiClient } from "@repo/treaty";

export const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_SERVER_URL!,
);
