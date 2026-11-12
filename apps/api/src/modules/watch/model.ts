import { t, type UnwrapSchema } from "elysia";

export namespace WatchModel {
  export const AddVideoToQueue = t.Object({
    url: t.String({ maxLength: 2000 }),
  });

  export const SetPlayback = t.Object({
    position: t.Number({ minimum: 0 }),
  });

  export const SkipVideo = t.Object({
    currentId: t.Integer(),
  });

  export const MoveVideo = t.Object({
    beforeId: t.Nullable(t.Integer()),
  });
}

export type WatchModel = {
  [k in keyof typeof WatchModel]: UnwrapSchema<(typeof WatchModel)[k]>;
};
