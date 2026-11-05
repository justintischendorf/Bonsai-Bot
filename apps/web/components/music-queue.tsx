import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import { useState } from "react";

import { useLimitVisibleItems } from "@/hooks/use-limit-visible-items";
import {
  type MusicQueueResponse,
  musicQueueQueryKey,
  useMusicQueue,
} from "@/hooks/use-music-queue";
import { cn } from "@/lib/utils";
import { apiClient } from "@repo/api-client";

import { MusicQueueDialog } from "./music-queue-dialog";
import MusicQueueEmpty from "./music-queue-empty";
import SongCover from "./song-cover";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toast";

const MAX_VISIBLE_SONGS = 6;

type QueuedSong = NonNullable<
  MusicQueueResponse["data"]
>["server"]["queue"][number];

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const dragInstructions = {
  draggable:
    "Mit der Leertaste aufnehmen, mit den Pfeiltasten verschieben und mit der Leertaste ablegen. Escape bricht ab.",
};

const dragAnnouncements: Announcements = {
  onDragStart: () => "Song aufgenommen.",
  onDragOver: ({ over }) =>
    over ? `Position ${over.data.current?.sortable.index + 1}.` : undefined,
  onDragEnd: ({ over }) =>
    over
      ? `Song auf Position ${over.data.current?.sortable.index + 1} abgelegt.`
      : "Song abgelegt.",
  onDragCancel: () => "Verschieben abgebrochen.",
};

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function SortableSong({
  song,
  index,
  isRemoveDisabled,
  onRemove,
}: {
  song: QueuedSong;
  index: number;
  isRemoveDisabled: boolean;
  onRemove: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: song.id,
    attributes: { roleDescription: "sortierbar" },
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "stagger flex shrink-0 items-center gap-2 rounded-xl border border-accent bg-background p-2 sm:gap-3 sm:p-3",
        isDragging && "relative z-10 border-bonsai-leaf-light shadow-lg",
      )}
    >
      <Button
        ref={setActivatorNodeRef}
        aria-label={`${song.title} verschieben`}
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        variant="ghost"
        size="icon-sm"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <SongCover
        artworkUrl={song.artworkUrl}
        label={`Cover von ${song.title}`}
        sizes="40px"
        className="size-10 rounded-md bg-muted"
        iconClassName="size-4 text-muted-foreground"
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold">
          <span className="mr-2 font-medium text-muted-foreground">
            {index + 1}
          </span>
          {song.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-bonsai-leaf-light tabular-nums sm:hidden">
            {formatDuration(song.duration)} ·{" "}
          </span>
          {song.artist} · Gewünscht von {song.requestedBy}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs font-medium text-bonsai-leaf-light tabular-nums sm:inline">
        {formatDuration(song.duration)}
      </span>
      <Button
        aria-label={`${song.title} aus der Warteschlange entfernen`}
        className="shrink-0"
        variant="ghost"
        size="icon-sm"
        type="button"
        disabled={isRemoveDisabled}
        onClick={() => onRemove(song.id)}
      >
        <X />
      </Button>
    </article>
  );
}

export default function MusicQueue() {
  const { data: musicQueueResponse, isLoading: isMusicQueueLoading } =
    useMusicQueue();
  // Hält die Liste beim Ziehen fest, damit die Abfrage alle paar Sekunden sie nicht unter dem Zeiger umsortiert.
  const [songsWhileDragging, setSongsWhileDragging] = useState<
    QueuedSong[] | null
  >(null);
  const songs =
    songsWhileDragging ?? musicQueueResponse?.data?.server.queue ?? [];
  const listRef = useLimitVisibleItems(MAX_VISIBLE_SONGS, songs.length);
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { mutate: removeSong, isPending: isRemovingSong } = useMutation({
    mutationFn: async (id: number) =>
      apiClient.api.music["remove-song"]({ id }).delete(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({
          title: "Fehler beim Entfernen des Songs",
          description: (error.value as { message: string }).message,
        });
      }
      queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
    },
  });

  const { mutate: moveSong } = useMutation({
    mutationFn: async ({
      id,
      beforeId,
    }: {
      id: number;
      beforeId: number | null;
    }) => apiClient.api.music["move-song"]({ id }).post({ beforeId }),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({
          title: "Fehler beim Verschieben des Songs",
          description: (error.value as { message: string }).message,
        });
      }
    },
    // Lädt auch nach einem Fehler neu und setzt die Liste so auf den echten Stand zurück.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: musicQueueQueryKey }),
  });

  function handleDragEnd({ active, over }: DragEndEvent) {
    setSongsWhileDragging(null);
    if (!over || active.id === over.id) return;

    const newIndex = songs.findIndex((song) => song.id === over.id);
    const reordered = arrayMove(
      songs,
      songs.findIndex((song) => song.id === active.id),
      newIndex,
    );

    // Direkt setzen statt in onMutate: Das läuft erst später, die Liste würde sonst kurz zurückspringen.
    void queryClient.cancelQueries({ queryKey: musicQueueQueryKey });
    queryClient.setQueryData<MusicQueueResponse>(musicQueueQueryKey, (old) =>
      old?.data
        ? {
            ...old,
            data: {
              ...old.data,
              server: { ...old.data.server, queue: reordered },
            },
          }
        : old,
    );
    moveSong({
      id: Number(active.id),
      beforeId: reordered[newIndex + 1]?.id ?? null,
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-semibold">Warteschlange</h2>
          {isMusicQueueLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {songs.length} {songs.length === 1 ? "Song" : "Songs"}
            </span>
          )}
        </div>
        <MusicQueueDialog />
      </div>
      {!isMusicQueueLoading && songs.length === 0 && <MusicQueueEmpty />}
      <DndContext
        id="music-queue"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{
          announcements: dragAnnouncements,
          screenReaderInstructions: dragInstructions,
        }}
        onDragStart={() => setSongsWhileDragging(songs)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setSongsWhileDragging(null)}
      >
        <SortableContext
          items={songs.map((song) => song.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={listRef} className="flex flex-col gap-2 overflow-y-auto">
            {isMusicQueueLoading &&
              Array.from({ length: MAX_VISIBLE_SONGS }, (_, index) => (
                <div
                  key={index}
                  className="flex shrink-0 items-center gap-3 rounded-xl p-3"
                >
                  <Skeleton className="size-10 shrink-0 rounded-md" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            {songs.map((song, index) => (
              <SortableSong
                key={song.id}
                song={song}
                index={index}
                isRemoveDisabled={isRemovingSong}
                onRemove={removeSong}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
