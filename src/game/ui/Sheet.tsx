import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Bottom sheet on phones, centred (or side) window on larger screens. */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  side = false,
  closeLabel = "Close",
  hideClose = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  side?: boolean;
  closeLabel?: string;
  hideClose?: boolean;
}) {
  return (
    <div
      data-gp-scope
      className={`pointer-events-none absolute inset-0 z-30 flex items-end ${side ? "md:items-stretch md:justify-end" : "bg-foreground/20 md:items-center md:justify-center"}`}
    >
      <div
        className={`panel-sheet pointer-events-auto flex w-full animate-rise flex-col overflow-hidden rounded-t-3xl ${
          side ? "max-h-[56dvh] md:m-4 md:max-h-none md:w-[400px] md:rounded-3xl" : "max-h-[88dvh] md:max-h-[82dvh] md:max-w-3xl md:rounded-3xl"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          {!hideClose && (
            <button aria-label={closeLabel} onClick={onClose} className="btn-game btn-ghost h-10 w-10 shrink-0">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
