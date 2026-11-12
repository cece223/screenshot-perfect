import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// The whole 3D game (three.js, drei, browser storage) loads only in the browser.
const Game = lazy(() => import("@/game/Game"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bloom Boutique — 3D Clothing Store Simulator" },
      {
        name: "description",
        content:
          "Run your own 3D clothing boutique: stock racks, check out shoppers, level up to unlock accessories and decor. Plays with keyboard, touch or controller.",
      },
      { property: "og:title", content: "Bloom Boutique — 3D Clothing Store Simulator" },
      {
        property: "og:description",
        content: "Stock racks, ring up shoppers and grow a cozy 3D clothing boutique in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background">
      <div className="font-display text-4xl font-bold">
        Bloom <span className="italic text-primary">Boutique</span>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <Game />
      </Suspense>
    </ClientOnly>
  );
}
