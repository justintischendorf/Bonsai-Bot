import { ListMusic } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function MusicQueueEmpty() {
  return (
    <Empty className="stagger py-12">
      <EmptyHeader className="max-w-md">
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-xl text-bonsai-leaf-light"
        >
          <ListMusic className="size-6" />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-semibold">
          Die Warteschlange ist leer
        </EmptyTitle>
        <EmptyDescription className="text-pretty">
          Sobald sich jemand einen Song wünscht, taucht er hier auf.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
