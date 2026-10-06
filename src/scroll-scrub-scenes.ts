/**
 * Scene data for the home page film. Single-shot: one continuous 12s take
 * from the darkened kitchen to a navy shaker door with a gold pull.
 * Every poster is the exact first frame of the encoded clip beside it.
 * Keep this array a module constant.
 */
import type {
  ScrollScrubScene,
  ScrollScrubTheme,
} from "@/components/scroll-scrub/scroll-scrub";

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#d9b97a",
  background: "#0e0e0f",
  ink: "#f6f1e8",
  muted: "#bdb6aa",
};

export const scrollScrubScenes: ScrollScrubScene[] = [
  {
    body: "Shaker cabinetry in nine hand-finished doors, built to order and installed by our own crew across Maryland and DC.",
    clip: "/assets/world/scene-01.mp4",
    id: "after-hours",
    kicker: "Modern Bella Design · Beltsville",
    label: "The showroom",
    mobileClip: "/assets/world/scene-01-mobile.mp4",
    mobilePoster: "/assets/world/scene-01-mobile-poster.png",
    poster: "/assets/world/scene-01-poster.png",
    scroll: 3.2,
    linger: 0.15,
    tags: ["230+ cabinets", "9 finishes", "Delivery & install"],
    title: "Cabinetry, after hours.",
  },
];
