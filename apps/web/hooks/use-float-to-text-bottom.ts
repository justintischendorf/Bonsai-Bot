import { useLayoutEffect, useRef } from "react";

const LETTER_SPACING_STEP_PX = 0.02;
const MAX_LETTER_SPACING_STEPS = 50;

/**
 * Keeps a floated element level with the end of the text wrapping around it.
 * Render the spacer directly before the floated element, both before the text.
 * CSS alone can't do this: moving the float rewraps the text and changes its height.
 */
export function useFloatToTextBottom() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const spacer = spacerRef.current;
    const text = textRef.current;
    const floated = spacer?.nextElementSibling;
    if (!spacer || !text || !floated) return;

    const placeAtTextBottom = () => {
      const floatedHeight = floated.getBoundingClientRect().height;
      const height = text.offsetHeight;
      spacer.style.height = `${Math.max(0, height - floatedHeight)}px`;
      return text.offsetHeight === height;
    };

    const fits = (letterSpacing: number) => {
      text.style.letterSpacing = `${letterSpacing}px`;
      return placeAtTextBottom() || placeAtTextBottom();
    };

    const align = () => {
      // Some widths have no resting position: one line lower the text gets a line
      // shorter, one line higher a line longer. Spread over every letter, a tiny
      // spacing change makes it fit without visibly touching the gaps between words.
      if (fits(0)) return;
      for (let step = 1; step <= MAX_LETTER_SPACING_STEPS; step++) {
        const spacing = step * LETTER_SPACING_STEP_PX;
        if (fits(-spacing) || fits(spacing)) return;
      }

      text.style.letterSpacing = "";
      placeAtTextBottom();
    };

    align();

    // Deferred to a frame: resizing the observed text inside the callback would
    // raise a "ResizeObserver loop" error.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(align);
    });
    observer.observe(text);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return { spacerRef, textRef };
}
