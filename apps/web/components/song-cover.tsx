import { Music } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export default function SongCover({
  artworkUrl,
  label,
  sizes,
  loading,
  className,
  iconClassName,
}: {
  artworkUrl?: string | null;
  label: string;
  sizes: string;
  loading?: "eager" | "lazy";
  className?: string;
  iconClassName?: string;
}) {
  // Merkt sich die URL statt eines Flags, damit der nächste Song wieder ein Bild zeigen kann.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      {artworkUrl && artworkUrl !== failedUrl ? (
        <Image
          src={artworkUrl}
          alt=""
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover"
          onError={() => setFailedUrl(artworkUrl)}
        />
      ) : (
        <Music className={iconClassName} />
      )}
    </div>
  );
}
