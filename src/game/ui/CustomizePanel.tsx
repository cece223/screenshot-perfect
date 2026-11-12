import {
  BOTTOM_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  SHOE_STYLES,
  SKIN_TONES,
  TOP_STYLES,
  type Appearance,
} from "../sim/appearance";
import { useGame } from "../store";
import { Sheet } from "./Sheet";

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          aria-label={`${label} ${c}`}
          data-selected={value === c}
          onClick={() => onPick(c)}
          className="swatch"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function Chips<T extends string>({ options, value, onPick }: { options: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} data-selected={value === o.id} onClick={() => onPick(o.id)} className="chip">
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function CustomizePanel() {
  const a = useGame((s) => s.appearance);
  const set = useGame((s) => s.setAppearance);
  const close = useGame((s) => s.closePanel);
  const first = useGame((s) => s.firstCustomize);
  const pick = <K extends keyof Appearance>(k: K) => (v: Appearance[K]) => set({ [k]: v } as Partial<Appearance>);

  return (
    <Sheet
      side
      title={first ? "Meet your shop owner" : "Style Mirror"}
      subtitle={first ? "Pick a look, then open the doors." : "Change your look anytime."}
      onClose={close}
      hideClose={first}
    >
      <div className="space-y-5 pb-2">
        <Section title="Skin tone">
          <Swatches label="Skin" colors={SKIN_TONES} value={a.skin} onPick={pick("skin")} />
        </Section>
        <Section title="Hairstyle">
          <Chips options={HAIR_STYLES} value={a.hairStyle} onPick={pick("hairStyle")} />
          <Swatches label="Hair color" colors={HAIR_COLORS} value={a.hairColor} onPick={pick("hairColor")} />
        </Section>
        <Section title="Top">
          <Chips options={TOP_STYLES} value={a.top} onPick={pick("top")} />
          <Swatches label="Top color" colors={OUTFIT_COLORS} value={a.topColor} onPick={pick("topColor")} />
        </Section>
        <Section title="Bottoms">
          <Chips options={BOTTOM_STYLES} value={a.bottom} onPick={pick("bottom")} />
          <Swatches label="Bottoms color" colors={OUTFIT_COLORS} value={a.bottomColor} onPick={pick("bottomColor")} />
        </Section>
        <Section title="Footwear">
          <Chips options={SHOE_STYLES} value={a.shoes} onPick={pick("shoes")} />
          <Swatches label="Shoe color" colors={OUTFIT_COLORS} value={a.shoeColor} onPick={pick("shoeColor")} />
        </Section>
        <button onClick={close} className="btn-game btn-primary h-12 w-full text-base">
          {first ? "Open the boutique" : "Done"}
        </button>
      </div>
    </Sheet>
  );
}
