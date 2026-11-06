"use client";

import { useGSAP } from "@gsap/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Music, Square } from "lucide-react";
import { useRef, useState } from "react";

import BonsaiFMPlayer from "@/components/bonsai-fm-player";
import { BonsaiLogo } from "@/components/bonsai-logo";
import LoadingSpinner from "@/components/loading-spinner";
import MusicQueue from "@/components/music-queue";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { musicQueueQueryKey, useMusicQueue } from "@/hooks/use-music-queue";
import { apiClient } from "@/lib/api-client";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

let introPlayed = false;
let queueIntroPlayed = false;

export default function BonsaiFM() {
  const queryClient = useQueryClient();
  const { data: musicResponse, isLoading: isMusicQueueLoading } =
    useMusicQueue();
  const jamStarted = musicResponse?.data?.server.connected ?? false;

  const pageRef = useRef<HTMLDivElement>(null);
  const [introStarted, setIntroStarted] = useState(introPlayed);

  const { mutateAsync: joinVoiceChannel, isPending: isJoiningVoiceChannel } =
    useMutation({
      mutationFn: async () => {
        return await apiClient.api.music.join.post();
      },
    });

  const { mutateAsync: leaveVoiceChannel, isPending: isLeavingVoiceChannel } =
    useMutation({
      mutationFn: async () => {
        return await apiClient.api.music.leave.post();
      },
    });

  useGSAP(
    () => {
      if (introPlayed) {
        gsap.set(".split, .jam-button, .fm-player", { opacity: 1 });
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
        .to(".jam-button, .fm-player", { opacity: 1, duration: 0.5 }, 0);
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (isMusicQueueLoading || queueIntroPlayed) return;
      if (!introStarted) {
        gsap.set(".stagger", { opacity: 0 });
        return;
      }
      queueIntroPlayed = true;
      gsap.fromTo(".stagger", { opacity: 0 }, { opacity: 1, stagger: 0.1 });
    },
    { scope: pageRef, dependencies: [isMusicQueueLoading, introStarted] },
  );

  async function handleJoinChannel() {
    const { error: joinError } = await joinVoiceChannel();

    if (joinError) {
      toast.add({
        title: "Fehler beim Betreten des Voice Channels",
        description: (joinError.value as { message: string }).message,
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
  }

  async function handleLeaveChannel() {
    const { error: leaveError } = await leaveVoiceChannel();

    if (leaveError) {
      toast.add({
        title: "Fehler beim Verlassen des Voice Channels",
        description: (leaveError.value as { message: string }).message,
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: musicQueueQueryKey });
  }

  function getButtonContent() {
    if (isJoiningVoiceChannel) {
      return <LoadingSpinner message="Jam startet ..." />;
    }
    if (isLeavingVoiceChannel) {
      return <LoadingSpinner message="Jam wird beendet ..." />;
    }
    return jamStarted ? (
      <>
        <Square />
        Jam beenden
      </>
    ) : (
      <>
        <Music />
        Jam starten
      </>
    );
  }

  return (
    <div ref={pageRef} className="flex flex-col gap-5 px-4 sm:px-8 xl:px-20">
      <div className="flex min-w-0 items-center gap-4">
        <BonsaiLogo className="size-14 shrink-0 sm:size-16" />
        <h1 className="text-3xl font-bold uppercase text-bonsai-pot-light min-[375px]:text-4xl sm:text-5xl">
          Bonsai FM
        </h1>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <p className="split opacity-0 max-w-3xl text-lg leading-relaxed text-pretty text-bonsai-pot [&_strong]:font-bold [&_strong]:text-bonsai-leaf-light">
          Hier startest du eine <strong>Jam</strong> für euren Abend. Geh zuerst
          in einen <strong>Voice-Channel</strong> und starte dann die Jam, damit{" "}
          <strong>Bonsai Bot</strong> zu dir in den Channel kommt. Wenn ihr
          fertig seid, beendest du die Jam einfach wieder.
        </p>
        <Button
          className="jam-button opacity-0 w-full shrink-0 transition-colors duration-300 hover:border-bonsai-leaf-light hover:bg-background hover:text-bonsai-leaf-light dark:hover:bg-input/30 sm:w-auto"
          variant="outline"
          type="button"
          disabled={isJoiningVoiceChannel || isLeavingVoiceChannel}
          onClick={(e) => {
            e.preventDefault();
            if (jamStarted) handleLeaveChannel();
            else handleJoinChannel();
          }}
        >
          {getButtonContent()}
        </Button>
      </div>
      <Separator />
      <div className="flex flex-col gap-5 sm:flex-row w-full lg:gap-16">
        <BonsaiFMPlayer className="fm-player opacity-0" />
        <MusicQueue />
      </div>
    </div>
  );
}
