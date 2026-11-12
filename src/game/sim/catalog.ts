export type Gender = "women" | "men";
export type FixtureId = "wTops" | "wBottoms" | "mTops" | "mBottoms" | "wAcc" | "mAcc";
export type ItemShape =
  | "tee"
  | "blouse"
  | "buttondown"
  | "jeans"
  | "skirt"
  | "shorts"
  | "necklace"
  | "earrings"
  | "scarf"
  | "purse"
  | "watch"
  | "sunglasses";

export interface Product {
  id: string;
  name: string;
  gender: Gender;
  fixture: FixtureId;
  cost: number; // wholesale price paid on the office computer
  price: number; // what a customer pays at the register
  unlockLevel: number;
  color: string;
  shape: ItemShape;
}

export const LEVEL_ACCESSORIES = 5;
export const LEVEL_DECOR = 10;

export const PRODUCTS: Product[] = [
  { id: "w-tee", name: "Basic T-Shirt", gender: "women", fixture: "wTops", cost: 8, price: 18, unlockLevel: 1, color: "#f2a7a3", shape: "tee" },
  { id: "w-blouse", name: "Blouse", gender: "women", fixture: "wTops", cost: 14, price: 32, unlockLevel: 1, color: "#fbefd9", shape: "blouse" },
  { id: "w-jeans", name: "Jeans", gender: "women", fixture: "wBottoms", cost: 18, price: 42, unlockLevel: 1, color: "#6a8cc0", shape: "jeans" },
  { id: "w-skirt", name: "Skirt", gender: "women", fixture: "wBottoms", cost: 12, price: 28, unlockLevel: 1, color: "#c96a5a", shape: "skirt" },
  { id: "m-tee", name: "Basic T-Shirt", gender: "men", fixture: "mTops", cost: 8, price: 18, unlockLevel: 1, color: "#8db5a0", shape: "tee" },
  { id: "m-buttondown", name: "Button-Down Shirt", gender: "men", fixture: "mTops", cost: 15, price: 34, unlockLevel: 1, color: "#dce6f3", shape: "buttondown" },
  { id: "m-jeans", name: "Jeans", gender: "men", fixture: "mBottoms", cost: 18, price: 42, unlockLevel: 1, color: "#3f5b88", shape: "jeans" },
  { id: "m-shorts", name: "Shorts", gender: "men", fixture: "mBottoms", cost: 10, price: 24, unlockLevel: 1, color: "#c8b385", shape: "shorts" },
  { id: "w-necklace", name: "Necklace", gender: "women", fixture: "wAcc", cost: 12, price: 30, unlockLevel: LEVEL_ACCESSORIES, color: "#e0b545", shape: "necklace" },
  { id: "w-earrings", name: "Earrings", gender: "women", fixture: "wAcc", cost: 8, price: 22, unlockLevel: LEVEL_ACCESSORIES, color: "#f0d27a", shape: "earrings" },
  { id: "w-scarf", name: "Scarf", gender: "women", fixture: "wAcc", cost: 10, price: 26, unlockLevel: LEVEL_ACCESSORIES, color: "#d9806b", shape: "scarf" },
  { id: "w-purse", name: "Purse", gender: "women", fixture: "wAcc", cost: 25, price: 60, unlockLevel: LEVEL_ACCESSORIES, color: "#8a4b3c", shape: "purse" },
  { id: "m-watch", name: "Watch", gender: "men", fixture: "mAcc", cost: 30, price: 70, unlockLevel: LEVEL_ACCESSORIES, color: "#c4c8cc", shape: "watch" },
  { id: "m-sunglasses", name: "Sunglasses", gender: "men", fixture: "mAcc", cost: 12, price: 30, unlockLevel: LEVEL_ACCESSORIES, color: "#2b2b30", shape: "sunglasses" },
];

const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const productById = (id: string): Product | undefined => PRODUCTS_BY_ID[id];

/** Max items one rack or display case holds. */
export const FIXTURE_CAPACITY = 20;

export interface FixtureInfo {
  label: string;
  gender: Gender;
  kind: "rack" | "case";
  unlockLevel: number;
}

export const FIXTURES: Record<FixtureId, FixtureInfo> = {
  wTops: { label: "Women's Tops", gender: "women", kind: "rack", unlockLevel: 1 },
  wBottoms: { label: "Women's Bottoms", gender: "women", kind: "rack", unlockLevel: 1 },
  mTops: { label: "Men's Tops", gender: "men", kind: "rack", unlockLevel: 1 },
  mBottoms: { label: "Men's Bottoms", gender: "men", kind: "rack", unlockLevel: 1 },
  wAcc: { label: "Women's Accessories", gender: "women", kind: "case", unlockLevel: LEVEL_ACCESSORIES },
  mAcc: { label: "Men's Accessories", gender: "men", kind: "case", unlockLevel: LEVEL_ACCESSORIES },
};
export const FIXTURE_IDS = Object.keys(FIXTURES) as FixtureId[];
export const productsForFixture = (f: FixtureId) => PRODUCTS.filter((p) => p.fixture === f);

export type DecorId = "wallArt" | "plants" | "rugRound" | "rugRunner" | "lighting";
export interface DecorItem {
  id: DecorId;
  name: string;
  description: string;
  cost: number;
  unlockLevel: number;
}
export const DECOR: DecorItem[] = [
  { id: "wallArt", name: "Gallery Wall Art", description: "Framed abstract prints across your walls", cost: 150, unlockLevel: LEVEL_DECOR },
  { id: "plants", name: "Indoor Plants", description: "Lush potted plants in the corners", cost: 90, unlockLevel: LEVEL_DECOR },
  { id: "rugRound", name: "Round Fitting Rug", description: "A soft round rug beside the mirror", cost: 70, unlockLevel: LEVEL_DECOR },
  { id: "rugRunner", name: "Entrance Runner Rug", description: "A welcoming rug by the front door", cost: 90, unlockLevel: LEVEL_DECOR },
  { id: "lighting", name: "Ambient Lighting", description: "Warm floor lamps and glowing pendants", cost: 160, unlockLevel: LEVEL_DECOR },
];

export type PatternKind =
  | "solid"
  | "stripes"
  | "dots"
  | "trellis"
  | "planks"
  | "checker"
  | "terrazzo"
  | "herringbone"
  | "tiles";

export interface StyleOption {
  id: string;
  name: string;
  surface: "wall" | "floor";
  cost: number;
  pattern: PatternKind;
  colors: string[];
}

export const WALLPAPERS: StyleOption[] = [
  { id: "cream", name: "Cream Plaster", surface: "wall", cost: 0, pattern: "solid", colors: ["#f6ecdc"] },
  { id: "blush", name: "Blush Pink", surface: "wall", cost: 60, pattern: "solid", colors: ["#f3cfc6"] },
  { id: "sage", name: "Sage Green", surface: "wall", cost: 60, pattern: "solid", colors: ["#c9d8c5"] },
  { id: "stripes", name: "Candy Stripes", surface: "wall", cost: 120, pattern: "stripes", colors: ["#fbf1e4", "#f0bdb2"] },
  { id: "dots", name: "Polka Dots", surface: "wall", cost: 120, pattern: "dots", colors: ["#e3ecdf", "#f7f2e8"] },
  { id: "trellis", name: "Navy Trellis", surface: "wall", cost: 150, pattern: "trellis", colors: ["#2f3f5c", "#d9b45a"] },
];

export const FLOORS: StyleOption[] = [
  { id: "oak", name: "Light Oak", surface: "floor", cost: 0, pattern: "planks", colors: ["#d8b48a", "#c9a173"] },
  { id: "walnut", name: "Walnut Planks", surface: "floor", cost: 100, pattern: "planks", colors: ["#7a5236", "#6a452c"] },
  { id: "rose", name: "Rose Tile", surface: "floor", cost: 120, pattern: "tiles", colors: ["#efc9bf", "#f8e6df"] },
  { id: "checker", name: "Checker Marble", surface: "floor", cost: 150, pattern: "checker", colors: ["#f4f0ea", "#2d2b2e"] },
  { id: "terrazzo", name: "Terrazzo", surface: "floor", cost: 160, pattern: "terrazzo", colors: ["#efe7dc", "#d9826e", "#7fa392", "#e0b545"] },
  { id: "herring", name: "Herringbone", surface: "floor", cost: 180, pattern: "herringbone", colors: ["#c99b6d", "#b3855a"] },
];

export const DEFAULT_WALL = "cream";
export const DEFAULT_FLOOR = "oak";
export const styleById = (id: string) => [...WALLPAPERS, ...FLOORS].find((s) => s.id === id);
