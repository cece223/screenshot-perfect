import type { ItemShape } from "../sim/catalog";

const PATHS: Record<ItemShape, string> = {
  tee: "M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-.8 1.3-2.3 2-4 2s-3.2-.7-4-2z",
  blouse: "M8 3 2 7l2 6 3-2v10h10V11l3 2 2-6-6-4-4 4z",
  buttondown: "M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3-4 3z",
  jeans: "M7 3h10l1 18h-4.5L12 10l-1.5 11H6z",
  skirt: "M8 4h8l4.5 15h-17z",
  shorts: "M6 5h12l1.2 10h-5.5L12 11l-1.7 4H4.8z",
  necklace: "M6 4c0 6 2.7 9 6 9s6-3 6-9h-1.6c0 4.7-2 7.4-4.4 7.4S7.6 8.7 7.6 4zM12 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
  earrings: "M7 4h1.5v5H7zM15.5 4H17v5h-1.5zM7.75 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm8.5 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  scarf: "M6 3h12v5l-3.5 2.5V21h-3.5V10.5L6 8z",
  purse: "M5 9h14l-1.2 11H6.2zM9 9V7a3 3 0 0 1 6 0v2h-1.5V7a1.5 1.5 0 0 0-3 0v2z",
  watch: "M9 2h6l1 4.5a6 6 0 0 1 0 11L15 22H9l-1-4.5a6 6 0 0 1 0-11zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  sunglasses: "M2 9h20v2h-1.2a4.5 4.5 0 0 1-8.6 1h-.4a4.5 4.5 0 0 1-8.6-1H2z",
};

export function ProductIcon({ shape, color, className }: { shape: ItemShape; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={PATHS[shape]} fill={color} stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round" fillRule="evenodd" />
    </svg>
  );
}
