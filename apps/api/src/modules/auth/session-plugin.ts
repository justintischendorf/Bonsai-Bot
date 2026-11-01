import { Elysia } from "elysia";

import { auth } from "@repo/auth";

export const sessionPlugin = new Elysia({ name: "session" }).derive(
  { as: "global" },
  async ({ request, set }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      set.status = 401;
      throw new Error("UNAUTHORIZED");
    }

    return {
      user: session.user,
      session: session.session,
    };
  },
);
