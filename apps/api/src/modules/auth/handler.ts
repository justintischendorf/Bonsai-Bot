import { Elysia } from "elysia";

import { auth } from "@repo/auth";

export const authPlugin = new Elysia({ prefix: "/auth" }).all(
  "/*",
  ({ request }) => auth.handler(request),
);
