import { Gamepad2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export default function GameCover({
  imageUrl,
  label,
  sizes,
  loading,
  className,
  iconClassName,
}: {
  imageUrl?: string | null;
  label: string;
  sizes: string;
  loading?: "eager" | "lazy";
  className?: string;
  iconClassName?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex aspect-616/353 shrink-0 items-center justify-center overflow-hidden bg-muted",
        className,
      )}
    >
      {imageUrl && imageUrl !== failedUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <Gamepad2 className={cn("text-muted-foreground", iconClassName)} />
      )}
    </div>
  );
}
