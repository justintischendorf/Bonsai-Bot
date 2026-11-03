"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Blink = "none" | "both" | "left" | "right";
type Look = { x: number; y: number };

type BonsaiLogoProps = {
  className?: string;
  followCursor?: boolean;
};

const VIEWBOX = { x: 15, y: 18, size: 96 };
const EYES_CENTER = { x: 64, y: 101 };
const MAX_LOOK = { x: 3, y: 1.5 };
const POINTER_IDLE_MS = 2500;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function BonsaiLogo({
  className,
  followCursor = true,
}: BonsaiLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lastPointerMove = useRef(0);
  const [blink, setBlink] = useState<Blink>("none");
  const [look, setLook] = useState<Look>({ x: 0, y: 0 });
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  useEffect(() => {
    if (reducedMotion) return;

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const doBlink = (which: Blink, duration = 140) => {
      setBlink(which);
      later(() => setBlink("none"), duration);
    };

    const act = () => {
      const roll = Math.random();
      const pointerIdle =
        Date.now() - lastPointerMove.current > POINTER_IDLE_MS;

      if (roll < 0.5) {
        doBlink("both");
      } else if (roll < 0.65) {
        doBlink("both");
        later(() => doBlink("both"), 260);
      } else if (roll < 0.78) {
        doBlink(Math.random() < 0.5 ? "left" : "right", 320);
      } else if (pointerIdle) {
        setLook({
          x: (Math.random() < 0.5 ? -1 : 1) * MAX_LOOK.x,
          y: random(-MAX_LOOK.y, MAX_LOOK.y),
        });
        later(() => setLook({ x: 0, y: 0 }), random(900, 1600));
      } else {
        doBlink("both");
      }

      later(act, random(2000, 6000));
    };

    later(act, random(1200, 3000));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reducedMotion]);

  useEffect(() => {
    if (!followCursor || reducedMotion) return;

    let frame = 0;
    let pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      lastPointerMove.current = Date.now();
      pointer = { x: e.clientX, y: e.clientY };
      // Keep a pending frame: canceling it on every move would starve the update
      // until the pointer stops.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scale = rect.width / VIEWBOX.size;
        const dx =
          pointer.x - (rect.left + (EYES_CENTER.x - VIEWBOX.x) * scale);
        const dy = pointer.y - (rect.top + (EYES_CENTER.y - VIEWBOX.y) * scale);
        const distance = Math.hypot(dx, dy) || 1;
        const strength = Math.min(1, distance / 300);
        setLook({
          x: (dx / distance) * strength * MAX_LOOK.x,
          y: (dy / distance) * strength * MAX_LOOK.y,
        });
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [followCursor, reducedMotion]);

  const eyeStyle = (closed: boolean): React.CSSProperties => ({
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: `scaleY(${closed ? 0.12 : 1})`,
    transition: "transform 70ms ease-in-out",
  });

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.size} ${VIEWBOX.size}`}
      fill="none"
      role="img"
      aria-label="Bonsai Bot"
      className={className}
    >
      <g
        stroke="#C08552"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M64 90 C64 80 53 76 57 66 S70 54 62 42" />
        <path d="M57 66 Q47 64 39 60" strokeWidth={5} />
        <path d="M62 48 Q74 54 86 53" strokeWidth={5} />
      </g>

      <ellipse cx="38" cy="58" rx="17" ry="9.5" fill="#22C55E" />
      <ellipse cx="88" cy="53" rx="19" ry="10.5" fill="#22C55E" />
      <ellipse cx="61" cy="37" rx="28" ry="14" fill="#4ADE80" />

      <rect x="34" y="87" width="60" height="7" rx="3.5" fill="#E2E8F0" />
      <path
        d="M39 94 H89 L83 108 Q82 110 80 110 H48 Q46 110 45 108 Z"
        fill="#CBD5E1"
      />

      <g
        style={{
          transform: `translate(${look.x}px, ${look.y}px)`,
          transition: "transform 250ms ease-out",
        }}
      >
        <circle
          cx="56"
          cy="101"
          r="3"
          fill="#0F1F17"
          style={eyeStyle(blink === "both" || blink === "left")}
        />
        <circle
          cx="72"
          cy="101"
          r="3"
          fill="#0F1F17"
          style={eyeStyle(blink === "both" || blink === "right")}
        />
      </g>
    </svg>
  );
}
