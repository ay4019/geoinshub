import type { ReactNode, RefObject } from "react";

/** Shown above scrollable profile tables on small viewports. */
export const PROFILE_TABLE_SWIPE_HINT =
  "Narrow screen: swipe the table horizontally to see all columns and inputs.";

/** Minimum table widths so `table-fixed` columns do not collapse on narrow screens. */
export const PROFILE_TABLE_MIN = {
  c5: "min-w-[40rem] sm:min-w-[42rem]",
  c6: "min-w-[44rem] sm:min-w-[46rem]",
  c7: "min-w-[50rem] sm:min-w-[52rem]",
  c8: "min-w-[56rem] sm:min-w-[58rem]",
  c9: "min-w-[62rem] sm:min-w-[64rem]",
  c10: "min-w-[66rem] sm:min-w-[70rem]",
  c11: "min-w-[70rem] sm:min-w-[74rem]",
  c12: "min-w-[76rem] sm:min-w-[80rem]",
  /** Liquefaction-style wide grids */
  cWide: "min-w-[88rem] sm:min-w-[94rem]",
} as const;

export type ProfileTableMinKey = keyof typeof PROFILE_TABLE_MIN;

export function profileTableClass(min: ProfileTableMinKey): string {
  return `w-full ${PROFILE_TABLE_MIN[min]} table-fixed border-collapse text-left text-[11px] sm:text-[12px] lg:min-w-0 lg:text-[13px]`;
}

/** Tables that use `xl:` for body text size instead of `lg:`. */
export function profileTableClassXl(min: ProfileTableMinKey): string {
  return `w-full ${PROFILE_TABLE_MIN[min]} table-fixed border-collapse text-left text-[11px] sm:text-[12px] xl:min-w-0 xl:text-[12px]`;
}

/** Only min-width + reset at `lg:` — append to custom `table` classes (e.g. `divide-y`). */
export function profileTableScrollableMinClass(min: ProfileTableMinKey): string {
  return `${PROFILE_TABLE_MIN[min]} lg:min-w-0`;
}

export function profileTableScrollableMinClassXl(min: ProfileTableMinKey): string {
  return `${PROFILE_TABLE_MIN[min]} xl:min-w-0`;
}

export function ProfileTableScroll({
  children,
  className = "",
  showHint = true,
  scrollContainerRef,
}: {
  children: ReactNode;
  className?: string;
  showHint?: boolean;
  /** For Excel/DOM export that must target the bordered scroll region. */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      {showHint ? (
        <p className="mb-0 mt-4 text-xs text-slate-500 lg:hidden">{PROFILE_TABLE_SWIPE_HINT}</p>
      ) : null}
      <div
        ref={scrollContainerRef}
        className={`touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white ${showHint ? "mt-2" : "mt-4"} ${className}`.trim()}
      >
        {children}
      </div>
    </>
  );
}

export function ProfileTableHeaderCell({ title, unit }: { title: ReactNode; unit?: ReactNode }) {
  return (
    <span className="inline-flex max-w-[9rem] flex-col items-start gap-0.5 leading-tight sm:max-w-none sm:flex-row sm:items-baseline sm:gap-1 sm:whitespace-nowrap">
      <span className="break-words sm:break-normal">{title}</span>
      {unit ? <span className="shrink-0 text-slate-500 sm:inline">({unit})</span> : null}
    </span>
  );
}

export function cnProfileTableInput(locked: boolean): string {
  return [
    "w-full min-w-0 rounded-lg border border-slate-300 px-1.5 py-1 text-xs outline-none transition-colors duration-200 focus:border-slate-500 sm:px-2 sm:py-1.5 sm:text-[13px]",
    locked ? "cursor-not-allowed bg-slate-100 text-slate-500" : "text-slate-900",
  ].join(" ");
}

export const profileTableOutputCellClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-semibold text-slate-900 sm:px-2 sm:py-1.5 sm:text-[13px]";

export const profileTableThClass =
  "px-2 py-2 text-left align-top text-[11px] font-semibold sm:px-2.5 sm:py-3 sm:text-inherit lg:align-middle";

export const profileTableTdClass = "px-2 py-2 sm:px-2 sm:py-3";

export const profileTableRemoveButtonClass =
  "btn-base w-full px-1.5 py-1 text-xs sm:px-2 sm:py-1.5 sm:text-sm";

export const profileTableFooterButtonClass = "btn-base px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm";
