import { t, type UnwrapSchema } from "elysia";

export namespace MusicModel {
  export const AddSongToQueue = t.Object({
    title: t.Optional(t.String({ maxLength: 300 })),
    url: t.Optional(t.String({ maxLength: 2000 })),
  });

  // Der Song landet vor beforeId, bei null am Ende der Warteschlange.
  export const MoveSong = t.Object({
    beforeId: t.Nullable(t.Integer()),
  });
}

export type MusicModel = {
  [k in keyof typeof MusicModel]: UnwrapSchema<(typeof MusicModel)[k]>;
};
