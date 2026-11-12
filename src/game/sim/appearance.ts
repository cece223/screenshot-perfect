import type { Gender } from "./catalog";
import { pick } from "./rng";

export type HairStyle = "buzz" | "short" | "bob" | "long" | "ponytail" | "bun" | "curly";
export type TopStyle = "tee" | "longsleeve" | "tank" | "hoodie";
export type BottomStyle = "jeans" | "shorts" | "skirt";
export type ShoeStyle = "sneakers" | "boots" | "sandals";

export interface Appearance {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: ShoeStyle;
  shoeColor: string;
}

export const SKIN_TONES = ["#fbe0cf", "#f3cdb0", "#e5b48f", "#d29a72", "#b97c55", "#9a5f3d", "#7a4528", "#55301b"];
export const HAIR_COLORS = ["#1f1a17", "#3d2a1e", "#6b4429", "#a8713f", "#e2c07a", "#c4522f", "#9aa0a6", "#e889a6"];
export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "buzz", label: "Buzz" },
  { id: "short", label: "Short" },
  { id: "bob", label: "Bob" },
  { id: "long", label: "Long" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "curly", label: "Curly" },
];
export const TOP_STYLES: { id: TopStyle; label: string }[] = [
  { id: "tee", label: "T-Shirt" },
  { id: "longsleeve", label: "Long Sleeve" },
  { id: "tank", label: "Tank Top" },
  { id: "hoodie", label: "Hoodie" },
];
export const BOTTOM_STYLES: { id: BottomStyle; label: string }[] = [
  { id: "jeans", label: "Jeans" },
  { id: "shorts", label: "Shorts" },
  { id: "skirt", label: "Skirt" },
];
export const SHOE_STYLES: { id: ShoeStyle; label: string }[] = [
  { id: "sneakers", label: "Sneakers" },
  { id: "boots", label: "Boots" },
  { id: "sandals", label: "Sandals" },
];
export const OUTFIT_COLORS = [
  "#f4f1ea", "#2b2b30", "#d9806b", "#f2a7a3", "#e0b545", "#8db5a0",
  "#5f8fb8", "#3f5b88", "#7b5ea8", "#b3473c", "#c8b385", "#6b4f3a",
];

export const DEFAULT_APPEARANCE: Appearance = {
  skin: SKIN_TONES[2],
  hairStyle: "ponytail",
  hairColor: HAIR_COLORS[2],
  top: "tee",
  topColor: "#d9806b",
  bottom: "jeans",
  bottomColor: "#3f5b88",
  shoes: "sneakers",
  shoeColor: "#f4f1ea",
};

export function randomAppearance(rand: () => number, gender: Gender): Appearance {
  const women = gender === "women";
  return {
    skin: pick(rand, SKIN_TONES),
    hairStyle: pick(rand, women ? (["bob", "long", "ponytail", "bun", "curly"] as const) : (["buzz", "short", "curly", "short"] as const)),
    hairColor: pick(rand, HAIR_COLORS.slice(0, 7)),
    top: pick(rand, women ? (["tee", "longsleeve", "tank", "hoodie"] as const) : (["tee", "longsleeve", "hoodie"] as const)),
    topColor: pick(rand, OUTFIT_COLORS),
    bottom: pick(rand, women ? (["jeans", "skirt", "shorts"] as const) : (["jeans", "jeans", "shorts"] as const)),
    bottomColor: pick(rand, OUTFIT_COLORS),
    shoes: pick(rand, ["sneakers", "boots", "sandals"] as const),
    shoeColor: pick(rand, OUTFIT_COLORS),
  };
}
