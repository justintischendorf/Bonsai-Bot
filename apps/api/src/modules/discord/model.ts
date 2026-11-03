export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count: number;
  approximate_presence_count: number;
};

export type DiscordRole = {
  id: string;
  name: string;
  position: number;
};

export type DiscordMember = {
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
  };
  nick: string | null;
  roles: string[];
  joined_at: string;
};
