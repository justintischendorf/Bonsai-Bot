import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@repo/database";

export const auth = betterAuth({
  appName: "Bonsai Bot",
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      scope: ["guilds.members.read"],
      mapProfileToUser: (profile) => ({
        email: profile.email ?? `${profile.id}@discord.placeholder.invalid`,
      }),
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const account = await prisma.account.findFirst({
            where: { userId: session.userId, providerId: "discord" },
          });

          const res = await fetch(
            `https://discord.com/api/v10/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${account?.accessToken}` } },
          );

          if (!res.ok) {
            throw new APIError("FORBIDDEN", {
              code: "NOT_GUILD_MEMBER",
              message: "Du bist kein Mitglied unseres Discord-Servers.",
            });
          }
        },
      },
    },
  },
  trustedOrigins: [process.env.WEB_SERVER_URL!],
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
});
