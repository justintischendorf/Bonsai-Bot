import { t, type UnwrapSchema } from "elysia";

export namespace DiscordModel {
  export const Guild = t.Object({
    id: t.String(),
    name: t.String(),
    icon: t.Nullable(t.String()),
    approximate_member_count: t.Number(),
    approximate_presence_count: t.Number(),
  });

  export const Role = t.Object({
    id: t.String(),
    name: t.String(),
    position: t.Number(),
  });

  export const Member = t.Object({
    user: t.Object({
      id: t.String(),
      username: t.String(),
      global_name: t.Nullable(t.String()),
      avatar: t.Nullable(t.String()),
      bot: t.Optional(t.Boolean()),
    }),
    nick: t.Nullable(t.String()),
    roles: t.Array(t.String()),
    joined_at: t.String(),
  });
}

export type DiscordModel = {
  [k in keyof typeof DiscordModel]: UnwrapSchema<(typeof DiscordModel)[k]>;
};
