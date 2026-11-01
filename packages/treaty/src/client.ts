import { treaty } from "@elysia/eden";
import type { Treaty } from "@elysia/eden/treaty2";

import type { App } from "@repo/api";
import { createLogger } from "@repo/logger";

const logger = createLogger("treaty");
const API_SERVER_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;

if (!API_SERVER_URL) {
  logger.error("API_SERVER_URL is not defined");
}

export type ApiClient = Treaty.Create<App>;

export const createApiClient = (baseUrl: string): ApiClient => {
  return treaty<App>(baseUrl, {
    fetch: { credentials: "include" },
  });
};
