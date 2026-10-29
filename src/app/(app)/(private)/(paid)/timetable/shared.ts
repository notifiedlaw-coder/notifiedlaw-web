// Styles and text shared by the TimeTable editor and calendar.
export const OFFLINE = "Could not reach NotifiedLaw. Check your connection and try again.";
export const field = "h-9 min-w-0 rounded-[8px] bg-surface px-2.5 text-[14px] text-ink shadow-[0_0_0_1px_var(--hairline)] outline-none focus:shadow-[0_0_0_2px_#007AFF]";
export const label = "flex flex-col gap-1 text-[12px] font-semibold text-muted";
export const hours = (mins: number) => `${(mins / 60).toFixed(1).replace(/\.0$/, "")} h`;
