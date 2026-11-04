import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import Link from "next/link";
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
import { wishlistQueryKey } from "@/hooks/use-wishlist";
import { apiClient } from "@/lib/api-client";

import LoadingSpinner from "./loading-spinner";
import { toast } from "./ui/toast";

export function WishlistItemDialog() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [steamLink, setSteamLink] = useState("");
  const [instantGamingLink, setInstantGamingLink] = useState("");
  const [noLinkProvidedError, setNoLinkProvidedError] = useState(false);

  const { mutateAsync: addWishlistItem, isPending: isAddingWishlistItem } =
    useMutation({
      mutationFn: async (input: {
        steamLink: string;
        instantGamingLink: string;
      }) => {
        return apiClient.api.wishlist.post(input);
      },
    });

  async function handleSubmit(steamLink: string, instantGamingLink: string) {
    if (steamLink === "" && instantGamingLink === "") {
      setNoLinkProvidedError(true);
      return;
    } else {
      setNoLinkProvidedError(false);
    }

    const { error: addWishlistItemError } = await addWishlistItem({
      steamLink,
      instantGamingLink,
    });

    setIsOpen(false);

    if (addWishlistItemError) {
      toast.add({
        title:
          addWishlistItemError.status + " Fehler beim Hinzufügen des Spiels",
        description: addWishlistItemError.value.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    setSteamLink("");
    setInstantGamingLink("");

    toast.add({
      title: "Spiel erfolgreich hinzugefügt",
      description: "Das Spiel wurde auf die Wunschliste gesetzt.",
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            className="new-game-button opacity-0 w-full shrink-0 transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30 sm:w-auto"
            variant="outline"
            type="button"
          >
            <ListPlus />
            Spiel hinzufügen
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(steamLink, instantGamingLink);
          }}
        >
          <DialogHeader>
            <DialogTitle>Spiel auf die Wunschliste setzen</DialogTitle>
            <DialogDescription>
              Am besten gibst du den Link zu{" "}
              {
                <Link
                  className="text-bonsai-leaf-light"
                  href="https://store.steampowered.com/"
                >
                  Steam
                </Link>
              }{" "}
              und den Link zu{" "}
              <Link
                className="text-bonsai-leaf-light"
                href="https://www.instant-gaming.com/"
              >
                Instant Gaming
              </Link>{" "}
              an, damit Bonsai die Preise vergleichen kann und das günstigste
              Angebot findet.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="steam-link">Steam Link</Label>
              <Input
                aria-invalid={noLinkProvidedError}
                id="steam-link"
                name="steam-link"
                value={steamLink}
                onChange={(e) => setSteamLink(e.target.value)}
                placeholder="https://store.steampowered.com/app/123456/example-game/"
              />
            </Field>
            <Field>
              <Label htmlFor="instant-gaming-link">Instant Gaming Link</Label>
              <Input
                aria-invalid={noLinkProvidedError}
                id="instant-gaming-link"
                name="instant-gaming-link"
                value={instantGamingLink}
                onChange={(e) => setInstantGamingLink(e.target.value)}
                placeholder="https://www.instant-gaming.com/de/1234-buy-example-game-steam-key-global/"
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
            <Button type="submit">
              {isAddingWishlistItem ? (
                <LoadingSpinner message="Wird hinzugefügt..." />
              ) : (
                "Auf Wunschliste setzen"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
