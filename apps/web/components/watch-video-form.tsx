import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { watchQueueQueryKey } from "@/hooks/use-watch-queue";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import LoadingSpinner from "./loading-spinner";
import { toast } from "./ui/toast";

export function WatchVideoForm({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [noInputProvidedError, setNoInputProvidedError] = useState(false);

  const { mutateAsync: addVideo, isPending: isAddingVideo } = useMutation({
    mutationFn: async (input: { url: string }) => {
      return apiClient.api.watch["add-video"].post(input);
    },
  });

  async function handleSubmit() {
    const trimmedUrl = url.trim();
    if (trimmedUrl === "") {
      setNoInputProvidedError(true);
      return;
    }
    setNoInputProvidedError(false);

    const { error: addVideoError } = await addVideo({ url: trimmedUrl });

    if (addVideoError) {
      toast.add({
        title: addVideoError.status + " Fehler beim Hinzufügen des Videos",
        description: addVideoError.value.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: watchQueueQueryKey });
    setUrl("");

    toast.add({
      title: "Video erfolgreich hinzugefügt",
      description: "Das Video wurde auf die Warteschlange gesetzt.",
    });
  }

  return (
    <form
      className={cn("flex flex-col gap-2 sm:flex-row", className)}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Input
        aria-label="YouTube-Link"
        aria-invalid={noInputProvidedError}
        name="video-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      />
      <Button
        className="shrink-0 transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30"
        variant="outline"
        type="submit"
        disabled={isAddingVideo}
      >
        {isAddingVideo ? (
          <LoadingSpinner message="Wird hinzugefügt..." />
        ) : (
          <>
            <ListPlus />
            Video hinzufügen
          </>
        )}
      </Button>
    </form>
  );
}
