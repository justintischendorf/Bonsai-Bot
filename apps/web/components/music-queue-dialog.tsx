import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { musicQueueQueryKey } from "@/hooks/use-music-queue";
import { apiClient } from "@repo/api-client";

import LoadingSpinner from "./loading-spinner";
import { toast } from "./ui/toast";

export function MusicQueueDialog() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [noInputProvidedError, setNoInputProvidedError] = useState(false);

  const { mutateAsync: addSong, isPending: isAddingSong } = useMutation({
    mutationFn: async (input: { title?: string; url?: string }) => {
      return apiClient.api.music["add-song"].post(input);
    },
  });

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (trimmedTitle === "" && trimmedUrl === "") {
      setNoInputProvidedError(true);
      return;
    }
    setNoInputProvidedError(false);

    const { error: addSongError } = await addSong({
      title: trimmedTitle || undefined,
      url: trimmedUrl || undefined,
    });

    setIsOpen(false);

    if (addSongError) {
      toast.add({
        title: addSongError.status + " Fehler beim Hinzufügen des Songs",
        description: addSongError.value.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
    setTitle("");
    setUrl("");

    toast.add({
      title: "Song erfolgreich hinzugefügt",
      description: "Der Song wurde auf die Warteschlange gesetzt.",
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            className="shrink-0 transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30"
            variant="outline"
            type="button"
          >
            <ListPlus />
            Song hinzufügen
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Song auf die Warteschlange setzen</DialogTitle>
            <DialogDescription>
              Gib den Namen oder den YouTube-Link des Songs an, den du hören
              möchtest. Er wird hinten an die Warteschlange angehängt.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="song-title">Song-Name</Label>
              <Input
                aria-invalid={noInputProvidedError}
                id="song-title"
                name="song-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bohemian Rhapsody"
              />
            </Field>
            <Field>
              <Label htmlFor="song-link">Song-Link</Label>
              <Input
                aria-invalid={noInputProvidedError}
                id="song-link"
                name="song-link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button">
                  Abbrechen
                </Button>
              }
            />
            <Button type="submit" disabled={isAddingSong}>
              {isAddingSong ? (
                <LoadingSpinner message="Wird hinzugefügt..." />
              ) : (
                "Zur Warteschlange"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
