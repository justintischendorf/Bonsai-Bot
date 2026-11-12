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
import Image from "next/image";
import { useState } from "react";

import { useLimitVisibleItems } from "@/hooks/use-limit-visible-items";
import {
  type QueuedVideo,
  type WatchQueueResponse,
  useWatchQueue,
  watchQueueQueryKey,
} from "@/hooks/use-watch-queue";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toast";
import WatchQueueEmpty from "./watch-queue-empty";

const MAX_VISIBLE_VIDEOS = 6;

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const dragInstructions = {
  draggable:
    "Mit der Leertaste aufnehmen, mit den Pfeiltasten verschieben und mit der Leertaste ablegen. Escape bricht ab.",
};

const dragAnnouncements: Announcements = {
  onDragStart: () => "Video aufgenommen.",
  onDragOver: ({ over }) =>
    over ? `Position ${over.data.current?.sortable.index + 1}.` : undefined,
  onDragEnd: ({ over }) =>
    over
      ? `Video auf Position ${over.data.current?.sortable.index + 1} abgelegt.`
      : "Video abgelegt.",
  onDragCancel: () => "Verschieben abgebrochen.",
};

function SortableVideo({
  video,
  index,
  isRemoveDisabled,
  onRemove,
}: {
  video: QueuedVideo;
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
    id: video.id,
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
        aria-label={`${video.title} verschieben`}
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        variant="ghost"
        size="icon-sm"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold">
          <span className="mr-2 font-medium text-muted-foreground">
            {index + 1}
          </span>
          {video.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {video.channel} · Gewünscht von {video.requestedBy}
        </p>
      </div>
      <Button
        aria-label={`${video.title} aus der Warteschlange entfernen`}
        className="shrink-0"
        variant="ghost"
        size="icon-sm"
        type="button"
        disabled={isRemoveDisabled}
        onClick={() => onRemove(video.id)}
      >
        <X />
      </Button>
    </article>
  );
}

export default function WatchQueue() {
  const { data: watchQueueResponse, isLoading: isWatchQueueLoading } =
    useWatchQueue();
  const [videosWhileDragging, setVideosWhileDragging] = useState<
    QueuedVideo[] | null
  >(null);
  const videos =
    videosWhileDragging ?? watchQueueResponse?.data?.server.queue ?? [];
  const listRef = useLimitVisibleItems(MAX_VISIBLE_VIDEOS, videos.length);
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { mutate: removeVideo, isPending: isRemovingVideo } = useMutation({
    mutationFn: async (id: number) =>
      apiClient.api.watch["remove-video"]({ id }).delete(),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({
          title: "Fehler beim Entfernen des Videos",
          description: (error.value as { message: string }).message,
        });
      }
      queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
    },
  });

  const { mutate: moveVideo } = useMutation({
    mutationFn: async ({
      id,
      beforeId,
    }: {
      id: number;
      beforeId: number | null;
    }) => apiClient.api.watch["move-video"]({ id }).post({ beforeId }),
    onSuccess: ({ error }) => {
      if (error) {
        toast.add({
          title: "Fehler beim Verschieben des Videos",
          description: (error.value as { message: string }).message,
        });
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: watchQueueQueryKey }),
  });

  function handleDragEnd({ active, over }: DragEndEvent) {
    setVideosWhileDragging(null);
    if (!over || active.id === over.id) return;

    const newIndex = videos.findIndex((video) => video.id === over.id);
    const reordered = arrayMove(
      videos,
      videos.findIndex((video) => video.id === active.id),
      newIndex,
    );

    void queryClient.cancelQueries({ queryKey: watchQueueQueryKey });
    queryClient.setQueryData<WatchQueueResponse>(watchQueueQueryKey, (old) =>
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
    moveVideo({
      id: Number(active.id),
      beforeId: reordered[newIndex + 1]?.id ?? null,
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <h2 className="text-lg font-semibold">Warteschlange</h2>
        {isWatchQueueLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <span className="text-sm text-muted-foreground">
            {videos.length} {videos.length === 1 ? "Video" : "Videos"}
          </span>
        )}
      </div>
      {!isWatchQueueLoading && videos.length === 0 && <WatchQueueEmpty />}
      <DndContext
        id="watch-queue"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{
          announcements: dragAnnouncements,
          screenReaderInstructions: dragInstructions,
        }}
        onDragStart={() => setVideosWhileDragging(videos)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setVideosWhileDragging(null)}
      >
        <SortableContext
          items={videos.map((video) => video.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={listRef} className="flex flex-col gap-2 overflow-y-auto">
            {isWatchQueueLoading &&
              Array.from({ length: MAX_VISIBLE_VIDEOS }, (_, index) => (
                <div
                  key={index}
                  className="flex shrink-0 items-center gap-3 rounded-xl p-3"
                >
                  <Skeleton className="aspect-video w-20 shrink-0 rounded-md" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            {videos.map((video, index) => (
              <SortableVideo
                key={video.id}
                video={video}
                index={index}
                isRemoveDisabled={isRemovingVideo}
                onRemove={removeVideo}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
