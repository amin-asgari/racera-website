"use client";

import { useEffect, useRef } from "react";

const MOTION_PATH = "/assets/motions/RaceraMo.json";

export function RaceraMotionLogo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let destroy: (() => void) | undefined;

    void import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // `Path` is the hidden track-matte provider (`td: 1`) for `Mask`
      // (`tt: 1`), so Lottie clips with it without painting a second layer.
      const animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: !reduceMotion,
        path: MOTION_PATH,
        rendererSettings: {
          hideOnTransparent: true,
          preserveAspectRatio: "xMinYMid meet",
          progressiveLoad: false,
          title: "Racera",
        },
      });

      const freezeOnLastFrame = () => {
        animation.goToAndStop(Math.max(0, animation.totalFrames - 1), true);
      };

      if (reduceMotion) animation.addEventListener("DOMLoaded", freezeOnLastFrame);
      else animation.addEventListener("complete", freezeOnLastFrame);

      destroy = () => {
        animation.removeEventListener("DOMLoaded", freezeOnLastFrame);
        animation.removeEventListener("complete", freezeOnLastFrame);
        animation.destroy();
      };
    });

    return () => {
      disposed = true;
      destroy?.();
      container.replaceChildren();
    };
  }, []);

  return <div ref={containerRef} className={className} role="img" aria-label="Racera" />;
}
