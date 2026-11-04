import { Swords } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function WishlistEmptyCard() {
  return (
    <Empty>
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon">
          <Swords />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-semibold">
          Keine Spiele auf der Wunschliste
        </EmptyTitle>
        <EmptyDescription className="text-sm leading-relaxed">
          Füge Spiele zu deiner Wunschliste hinzu, um sie hier zu sehen.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2"></EmptyContent>
    </Empty>
  );
}
