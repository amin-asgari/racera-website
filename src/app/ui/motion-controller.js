"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function MotionController() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.from(".site-header", {
        y: -24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.from(".hero .reveal-item", {
        y: 32,
        opacity: 0,
        duration: 0.8,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".phone-front", {
        y: 70,
        rotate: 4,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
        delay: 0.25,
      });

      gsap.from(".phone-back", {
        y: 90,
        x: 40,
        rotate: 9,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        delay: 0.35,
      });

      gsap.from(".floating-card", {
        scale: 0.88,
        opacity: 0,
        duration: 0.65,
        stagger: 0.12,
        ease: "back.out(1.6)",
        delay: 0.8,
      });

      gsap.to(".hero-orbit", {
        rotate: 30,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.utils.toArray(".reveal-section").forEach((section) => {
        gsap.from(section.children, {
          y: 28,
          opacity: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 82%", once: true },
        });
      });

      gsap.utils.toArray(".reveal-grid").forEach((grid) => {
        gsap.from(grid.children, {
          y: 24,
          opacity: 0,
          scale: 0.97,
          duration: 0.55,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: { trigger: grid, start: "top 84%", once: true },
        });
      });

      gsap.utils.toArray(".feature-visual").forEach((visual) => {
        const phones = visual.querySelectorAll(".feature-phone");
        const float = visual.querySelector(".feature-float");
        gsap.from(phones, {
          y: 70,
          rotate: -2,
          opacity: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: visual, start: "top 76%", once: true },
        });
        if (float) {
          gsap.from(float, {
            x: 42,
            opacity: 0,
            duration: 0.7,
            ease: "back.out(1.5)",
            scrollTrigger: { trigger: visual, start: "top 66%", once: true },
          });
        }
      });

      gsap.fromTo(
        ".track-line path",
        { strokeDashoffset: 920 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".download-section",
            start: "top 78%",
            end: "center 45%",
            scrub: 1,
          },
        },
      );
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh, { once: true });

    return () => {
      window.removeEventListener("load", refresh);
      context.revert();
    };
  }, []);

  return null;
}
