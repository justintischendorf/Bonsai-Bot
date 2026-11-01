import { createAuthClient } from "better-auth/react";

const authBaseURL = process.env.NEXT_PUBLIC_AUTH_BASE_URL?.trim();
if (!authBaseURL) {
  throw new Error("Missing NEXT_PUBLIC_AUTH_BASE_URL.");
}

export const authClient = createAuthClient({
  baseURL: authBaseURL.replace(/\/+$/, ""),
});

export const { useSession } = authClient;
