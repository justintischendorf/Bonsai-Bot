"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ChevronDown, MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import bonsaiBotTitle from "@/assets/logos/bonsai-bot-title.svg";
import { BonsaiLogo } from "@/components/bonsai-logo";
import MemberCard, { MemberCardSkeleton } from "@/components/member-card";
import NowPlaying from "@/components/now-playing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import WishlistSuggestion from "@/components/wishlist-suggestion";
import { useDiscordMemberInfo } from "@/hooks/use-discord-member-info";
import { useFloatToTextBottom } from "@/hooks/use-float-to-text-bottom";
import { useLimitVisibleItems } from "@/hooks/use-limit-visible-items";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const MAX_VISIBLE_MEMBERS = 12;

let introPlayed = false;
let cardsIntroPlayed = false;

export default function DashboardPage() {
  const linkStyles =
    "intro-link opacity-0 group flex flex-1 items-center justify-start rounded-xl gap-4 px-4 py-2 transition-colors duration-300 hover:border-bonsai-leaf-light hover:text-bonsai-leaf-light";
  const { spacerRef, textRef } = useFloatToTextBottom();

  const [showMembers, setShowMembers] = useState(false);
  const previousShowMembers = useRef(showMembers);

  const {
    data: serverMembersResponse,
    isLoading: isDiscordServerMembersLoading,
  } = useDiscordMemberInfo();

  const serverMembers = serverMembersResponse?.data?.members.toSorted(
    (a, b) => Number(b.online) - Number(a.online),
  );
  const memberListRef = useLimitVisibleItems(
    MAX_VISIBLE_MEMBERS,
    serverMembers?.length ?? 0,
  );

  const pageRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        "#heading",
        { y: 0 },
        {
          y: -10,
          duration: 1.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      );

      if (introPlayed) {
        gsap.set(
          ".intro-card, .split, .bonsai-logo, .intro-link, .member-toggle",
          { opacity: 1 },
        );
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
      tl.fromTo(".intro-card", { opacity: 0 }, { opacity: 1, stagger: 0.1 })
        .set(".split", { opacity: 1, immediateRender: false }, "-=0.3")
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
          "<",
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
        .to(
          ".bonsai-logo, .intro-link, .member-toggle",
          { opacity: 1, duration: 1 },
          "-=0.4",
        );
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      const toggled = previousShowMembers.current !== showMembers;
      previousShowMembers.current = showMembers;

      if (isDiscordServerMembersLoading || (cardsIntroPlayed && !toggled))
        return;
      cardsIntroPlayed = true;
      gsap.fromTo(".stagger", { opacity: 0 }, { opacity: 1, stagger: 0.1 });
    },
    {
      scope: pageRef,
      dependencies: [isDiscordServerMembersLoading, showMembers],
    },
  );

  return (
    <main ref={pageRef}>
      <div className="flex-col sm:flex-row flex gap-5 pb-5 px-4 sm:px-8 xl:px-20">
        <WishlistSuggestion className="intro-card opacity-0" />
        <NowPlaying className="intro-card opacity-0" />
      </div>
      <div className="flex flex-col gap-10 items-start justify-center lg:flex-row lg:gap-0">
        <div className="w-full flex flex-col px-4 sm:px-8 lg:w-1/2 xl:px-20">
          <Image
            loading="eager"
            id="heading"
            className="intro-card opacity-0"
            src={bonsaiBotTitle}
            alt="Bonsai Bot"
            width={500}
          ></Image>
          <div className="flow-root">
            <div ref={spacerRef} className="float-right" />
            <BonsaiLogo className="bonsai-logo opacity-0 float-right clear-right ml-4 size-20 sm:size-30" />
            <p
              ref={textRef}
              className="split opacity-0 text-lg leading-relaxed text-pretty text-bonsai-pot [&_strong]:font-bold [&_strong]:text-bonsai-leaf-light"
            >
              <strong>Bonsai Bot</strong> ist der kleine Helfer unseres
              Discord-Servers: unscheinbar, aber immer zur Stelle. Er zeigt dir
              auf einen Blick, was auf dem Server los ist und{" "}
              <strong>wer gerade online ist</strong>, sodass du sofort siehst,
              ob sich noch jemand für eine Runde findet. Steht der nächste
              Spielekauf an, vergleicht er die Preise auf <strong>Steam</strong>{" "}
              und <strong>Instant Gaming</strong> und findet das{" "}
              <strong>günstigste Angebot</strong>, damit am Ende mehr fürs
              nächste Spiel übrig bleibt. Außerdem sammelt er alle{" "}
              <strong>Spiele, die wir zusammen spielen wollen</strong>. So geht
              keine gute Idee mehr im Chat unter, und die Frage „Was zocken wir
              heute?“ ist schnell beantwortet.
            </p>
          </div>
          <nav
            aria-label="Seiten"
            className="mt-10 flex flex-col sm:gap-4 text-lg leading-relaxed text-pretty sm:flex-row lg:mt-20"
          >
            <Link href="/wishlist" className={linkStyles}>
              Wunschliste
              <MoveRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/bonsai-fm" className={linkStyles}>
              Bonsai FM
              <MoveRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </nav>
        </div>
        <div className="w-full flex justify-center flex-wrap px-4 gap-2 sm:px-8 lg:w-1/2 lg:justify-end xl:px-20">
          <div
            className={`w-full flex justify-end items-center lg:mb-4 ${showMembers ? "mb-4" : ""}`}
          >
            <Button
              className="member-toggle opacity-0 w-full lg:hidden"
              variant="outline"
              type="button"
              aria-expanded={showMembers}
              onClick={() => setShowMembers(!showMembers)}
            >
              {showMembers
                ? "Mitgliederliste ausblenden"
                : "Mitgliederliste anzeigen"}
              <ChevronDown
                className={`transition-transform duration-300 ${showMembers ? "rotate-180" : ""}`}
              />
            </Button>
            <div className="hidden lg:block">
              {isDiscordServerMembersLoading ? (
                <Skeleton className="w-42 h-8" />
              ) : (
                <p className="text-lg font-semibold">
                  {serverMembers?.length} Mitglieder
                </p>
              )}
            </div>
          </div>

          <div
            ref={memberListRef}
            className={`w-full flex-wrap justify-center gap-2 overflow-y-auto lg:justify-end ${showMembers ? "flex" : "hidden lg:flex"}`}
          >
            {isDiscordServerMembersLoading
              ? Array.from({ length: 10 }, (_, index) => (
                  <MemberCardSkeleton key={index} />
                ))
              : serverMembers?.map((member) => (
                  <MemberCard
                    className="stagger"
                    member={member}
                    key={member.id}
                  />
                ))}
          </div>
        </div>
      </div>
    </main>
  );
}
