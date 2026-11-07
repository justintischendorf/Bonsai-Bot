"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";

import { BonsaiLogo } from "@/components/bonsai-logo";
import { Separator } from "@/components/ui/separator";
import { WishlistEmptyCard } from "@/components/wishlist-empty-card";
import WishlistItemCard, {
  WishlistItemCardSkeleton,
} from "@/components/wishlist-item-card";
import { WishlistItemDialog } from "@/components/wishlist-item-dialog";
import { useWishlist } from "@/hooks/use-wishlist";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const FIRST_ROW_SIZE = 4;

let introPlayed = false;
let cardsIntroPlayed = false;

export default function Wishlist() {
  const { data: wishlistResponse, isLoading: isWishlistLoading } =
    useWishlist();
  const wishlistItems = wishlistResponse?.data?.server;

  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (introPlayed) {
        gsap.set(".split, .new-game-button", { opacity: 1 });
        return;
      }

      const split = new SplitText(".split", {
        type: "words",
        wordsClass: "pr-[0.3em] -mr-[0.3em] inline-block",
      });

      const tl = gsap.timeline({
        onStart: () => {
          introPlayed = true;
        },
        scrollTrigger: {
          trigger: ".split",
          start: "top 80%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
      });
      tl.set(".split", { opacity: 1, immediateRender: false })
        .fromTo(
          split.words,
          {
            backgroundColor: "black",
            color: "black",
          },
          {
            backgroundColor: "rgb(74, 222, 128)",
            color: "white",
            duration: 0.2,
            stagger: 0.02,
            ease: "power2.inOut",
          },
        )
        .to(
          split.words,
          {
            backgroundColor: "white",
            color: "black",
            duration: 0.2,
            stagger: 0.02,
            ease: "power2.inOut",
          },
          "<0.2",
        )
        .to(
          split.words,
          {
            backgroundColor: "transparent",
            color: (_: number, word: Element) =>
              getComputedStyle(word.parentElement!).color,
            clearProps: "color,backgroundColor",
            duration: 0.3,
            stagger: 0.02,
            ease: "power2.inOut",
          },
          "<0.2",
        )
        .to(".new-game-button", { opacity: 1, duration: 1 }, "-=0.4");
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (isWishlistLoading || cardsIntroPlayed) return;
      cardsIntroPlayed = true;
      gsap.fromTo(".stagger", { opacity: 0 }, { opacity: 1, stagger: 0.1 });
    },
    { scope: pageRef, dependencies: [isWishlistLoading] },
  );

  return (
    <div ref={pageRef} className="flex flex-col gap-5 px-4 sm:px-8 xl:px-20">
      <div className="flex min-w-0 items-center gap-4">
        <BonsaiLogo className="size-14 shrink-0 sm:size-16" />
        <h1 className="text-3xl font-bold uppercase text-bonsai-pot-light min-[375px]:text-4xl sm:text-5xl">
          Wunschliste
        </h1>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <p className="split opacity-0 max-w-3xl text-lg leading-relaxed text-pretty text-bonsai-pot [&_strong]:font-bold [&_strong]:text-bonsai-leaf-light">
          Hier findest du alle <strong>Spiele</strong>, die auf deiner
          Wunschliste stehen. Füge neue hinzu, indem du den Link von{" "}
          <strong>Steam</strong>, <strong>Instant Gaming</strong> oder dem{" "}
          <strong>PlayStation Store</strong> angibst, oder entferne Spiele, die
          du nicht mehr brauchst.
        </p>
        <WishlistItemDialog />
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isWishlistLoading
          ? Array.from({ length: 8 }, (_, index) => (
              <WishlistItemCardSkeleton key={index} />
            ))
          : wishlistItems?.map((item, index) => (
              <WishlistItemCard
                className="stagger"
                key={item.id}
                item={item}
                // The first row (up to 4 columns) is visible right away
                imageLoading={index < FIRST_ROW_SIZE ? "eager" : "lazy"}
              />
            ))}
      </div>
      {wishlistItems?.length === 0 && !isWishlistLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <WishlistEmptyCard />
        </div>
      )}
    </div>
  );
}
