"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Gamepad2, MoveRight, Radio, TvMinimalPlay } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import bonsaiBotTitle from "@/assets/logos/bonsai-bot-title.svg";
import { BonsaiLogo } from "@/components/bonsai-logo";
import MemberCard, { MemberCardSkeleton } from "@/components/member-card";
import NowPlaying from "@/components/now-playing";
import { Skeleton } from "@/components/ui/skeleton";
import WishlistSuggestion from "@/components/wishlist-suggestion";
import { useDiscordMemberInfo } from "@/hooks/use-discord-member-info";
import { useFloatToTextBottom } from "@/hooks/use-float-to-text-bottom";
import { useLimitVisibleItems } from "@/hooks/use-limit-visible-items";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMusicQueue } from "@/hooks/use-music-queue";
import { useWishlistSuggestion } from "@/hooks/use-wishlist-suggestion";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const MAX_VISIBLE_MEMBERS = 12;
const MAX_VISIBLE_MEMBERS_MOBILE = 5;

const PAGE_LINKS = [
  {
    href: "/wishlist",
    title: "Wunschliste",
    description: "Spiele sammeln und Preise vergleichen",
    Icon: Gamepad2,
  },
  {
    href: "/bonsai-fm",
    title: "Bonsai FM",
    description: "Jam starten und Musik hören",
    Icon: Radio,
  },
  {
    href: "/bonsai-watch",
    title: "Bonsai Watch",
    description: "Youtube Videos zusammen schauen",
    Icon: TvMinimalPlay,
  },
];

let introPlayed = false;
let cardsIntroPlayed = false;

export default function DashboardPage() {
  const { spacerRef, textRef } = useFloatToTextBottom();

  const {
    data: serverMembersResponse,
    isLoading: isDiscordServerMembersLoading,
  } = useDiscordMemberInfo();

  const serverMembers = serverMembersResponse?.data?.members.toSorted(
    (a, b) => Number(b.online) - Number(a.online),
  );
  const isMobile = useMediaQuery("(max-width: 639px)");
  const memberListRef = useLimitVisibleItems(
    isMobile ? MAX_VISIBLE_MEMBERS_MOBILE : MAX_VISIBLE_MEMBERS,
    serverMembers?.length ?? 0,
  );

  const { data: wishlistSuggestionResponse } = useWishlistSuggestion();
  const { data: musicResponse } = useMusicQueue();
  const hasSuggestion = !!wishlistSuggestionResponse?.data?.server;
  const hasSong = !!musicResponse?.data?.server?.current;

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
        gsap.set(".intro-card, .split, .bonsai-logo, .intro-link", {
          opacity: 1,
        });
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
        .to(".bonsai-logo, .intro-link", { opacity: 1, duration: 1 }, "-=0.4");
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (!hasSuggestion && !hasSong) return;
      gsap.to(".status-card", { opacity: 1, stagger: 0.1 });
    },
    { scope: pageRef, dependencies: [hasSuggestion, hasSong] },
  );

  useGSAP(
    () => {
      if (isDiscordServerMembersLoading || cardsIntroPlayed) return;
      cardsIntroPlayed = true;
      gsap.fromTo(".stagger", { opacity: 0 }, { opacity: 1, stagger: 0.1 });
    },
    {
      scope: pageRef,
      dependencies: [isDiscordServerMembersLoading],
    },
  );

  return (
    <main ref={pageRef}>
      {(hasSuggestion || hasSong) && (
        <div className="flex-col sm:flex-row flex gap-5 pb-5 px-4 sm:px-8 xl:px-20">
          <WishlistSuggestion
            href="/wishlist"
            className="status-card opacity-0"
          />
          <NowPlaying href="/bonsai-fm" className="status-card opacity-0" />
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-x-0 lg:gap-y-16">
        <div className="w-full flex flex-col px-4 sm:px-8 lg:col-start-1 lg:row-start-1 xl:px-20">
          <Image
            loading="eager"
            id="heading"
            className="intro-card opacity-0 h-auto w-full max-w-125"
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
              ob sich noch jemand für eine Runde findet. Außerdem sammelt er
              alle <strong>Spiele, die wir zusammen spielen wollen</strong>, und
              schlägt jeden Tag eines davon als{" "}
              <strong>heutige Empfehlung</strong> vor. So geht keine gute Idee
              mehr im Chat unter, und die Frage „Was zocken wir heute?“ ist
              schnell beantwortet. Steht der nächste Spielekauf an, vergleicht
              er die Preise auf <strong>Steam</strong>,{" "}
              <strong>Instant Gaming</strong> und im{" "}
              <strong>PlayStation Store</strong> und findet das{" "}
              <strong>günstigste Angebot</strong>. Wird ein Spiel deutlich
              günstiger, <strong>meldet er sich im Discord</strong>, damit am
              Ende mehr fürs nächste Spiel übrig bleibt. Und wenn ihr zusammen
              im Voice-Channel sitzt, sorgt er mit <strong>Bonsai FM</strong>{" "}
              für die passende Musik.
            </p>
          </div>
        </div>
        <nav
          aria-label="Seiten"
          className="flex flex-col gap-3 px-4 sm:flex-row sm:px-8 lg:col-span-2 lg:row-start-2 lg:justify-center xl:px-20"
        >
          {PAGE_LINKS.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="intro-link opacity-0 group flex min-w-0 flex-1 items-center lg:w-72 lg:flex-none gap-3 rounded-xl border border-accent p-3 transition-colors duration-300 hover:border-bonsai-leaf-light"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-bonsai-leaf-light">
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold transition-colors duration-300 group-hover:text-bonsai-leaf-light">
                  {title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
              <MoveRight className="size-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-bonsai-leaf-light" />
            </Link>
          ))}
        </nav>
        <div className="w-full flex justify-center flex-wrap px-4 gap-2 sm:px-8 lg:col-start-2 lg:row-start-1 lg:justify-end xl:px-20">
          <div className="w-full flex justify-center items-center mb-4 lg:justify-end">
            {isDiscordServerMembersLoading ? (
              <Skeleton className="w-42 h-8" />
            ) : (
              <p className="text-lg font-semibold">
                {serverMembers?.length} Mitglieder
              </p>
            )}
          </div>

          <div
            ref={memberListRef}
            className="grid w-full grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
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
