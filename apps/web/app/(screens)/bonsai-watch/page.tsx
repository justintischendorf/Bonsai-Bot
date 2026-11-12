"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useRef, useState } from "react";

import { BonsaiLogo } from "@/components/bonsai-logo";
import { Separator } from "@/components/ui/separator";
import WatchPlayer from "@/components/watch-player";
import WatchQueue from "@/components/watch-queue";
import { WatchVideoForm } from "@/components/watch-video-form";
import { useWatchQueue } from "@/hooks/use-watch-queue";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

let introPlayed = false;
let queueIntroPlayed = false;

export default function BonsaiWatchPage() {
  const { isLoading: isWatchQueueLoading } = useWatchQueue();

  const pageRef = useRef<HTMLDivElement>(null);
  const [introStarted, setIntroStarted] = useState(introPlayed);

  useGSAP(
    () => {
      if (introPlayed) {
        gsap.set(".split, .video-form, .watch-player", { opacity: 1 });
        return;
      }

      const split = new SplitText(".split", {
        type: "words",
        wordsClass: "pr-[0.3em] -mr-[0.3em] inline-block",
      });

      const tl = gsap.timeline({
        onStart: () => {
          introPlayed = true;
          setIntroStarted(true);
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
        .to(".video-form, .watch-player", { opacity: 1, duration: 0.5 }, 0);
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (isWatchQueueLoading || queueIntroPlayed) return;
      if (!introStarted) {
        gsap.set(".stagger", { opacity: 0 });
        return;
      }
      queueIntroPlayed = true;
      gsap.fromTo(".stagger", { opacity: 0 }, { opacity: 1, stagger: 0.1 });
    },
    { scope: pageRef, dependencies: [isWatchQueueLoading, introStarted] },
  );

  return (
    <div ref={pageRef} className="flex flex-col gap-5 px-4 sm:px-8 xl:px-20">
      <div className="flex min-w-0 items-center gap-4">
        <BonsaiLogo className="size-14 shrink-0 sm:size-16" />
        <h1 className="text-3xl font-bold uppercase text-bonsai-pot-light min-[375px]:text-4xl sm:text-5xl">
          Bonsai Watch
        </h1>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <p className="split opacity-0 max-w-3xl text-lg leading-relaxed text-pretty text-bonsai-pot [&_strong]:font-bold [&_strong]:text-bonsai-leaf-light">
          Hier kannst du zusammen mit anderen <strong>Bonsai Bot</strong>{" "}
          Nutzern <strong>YouTube Videos</strong> schauen. Füge ein Video über
          seinen <strong>Link</strong> hinzu. <strong>Play</strong>,{" "}
          <strong>Pause</strong> und <strong>Springen</strong> gelten für alle,
          die gerade zuschauen.
        </p>
        <WatchVideoForm className="video-form opacity-0 w-full shrink-0 sm:w-md" />
      </div>
      <Separator />
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:gap-16">
        <WatchPlayer className="watch-player opacity-0" />
        <WatchQueue />
      </div>
    </div>
  );
}
