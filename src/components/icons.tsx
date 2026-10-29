const PATHS: Record<string, string> = {
  home: "M2.5 7.5 8 3l5.5 4.5V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z",
  sparkle: "M8 1.8l1.6 4.6L14.2 8l-4.6 1.6L8 14.2 6.4 9.6 1.8 8l4.6-1.6z",
  book: "M2 3.5h4a2 2 0 0 1 2 2V13a1.5 1.5 0 0 0-1.5-1.5H2zM14 3.5h-4a2 2 0 0 0-2 2V13a1.5 1.5 0 0 1 1.5-1.5H14z",
  cards: "M3.5 4.5h8A1.5 1.5 0 0 1 13 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5V6a1.5 1.5 0 0 1 1.5-1.5zM5 2.5h7.5A1.5 1.5 0 0 1 14 4v6",
  check: "M4 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 2zM5.5 8l1.8 1.8L10.5 6.5",
  trophy: "M4.5 2.5h7v3.5a3.5 3.5 0 0 1-7 0zM4.5 3.5H2.5a2 2 0 0 0 2 3M11.5 3.5h2a2 2 0 0 1-2 3M8 9.5v2.5M5.5 14h5",
  scales: "M8 2.5v11M5 13.5h6M3 4.5h10M3 4.5 1.5 8.5a1.5 1.5 0 0 0 3 0zM13 4.5l-1.5 4a1.5 1.5 0 0 0 3 0z",
  doc: "M4 1.8h5l3.5 3.5V13a1.2 1.2 0 0 1-1.2 1.2H4A1.2 1.2 0 0 1 2.8 13V3A1.2 1.2 0 0 1 4 1.8zM9 1.8v3.5h3.5M5 8.5h6M5 11h4",
  folder: "M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z",
  search: "M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.5 10.5l3 3",
  user: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14a5.5 5.5 0 0 1 11 0",
  lock: "M4.5 7h7a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-4A1.5 1.5 0 0 1 4.5 7zM5.5 7V5a2.5 2.5 0 0 1 5 0v2",
  back: "M10 3 5 8l5 5",
  headphones: "M3 10V8a5 5 0 0 1 10 0v2M3.5 10h1.5v4H3.5zM11 10h1.5v4H11z",
  note: "M3.5 2h9A1.5 1.5 0 0 1 14 3.5V10l-4 4H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2zM14 10h-2.5A1.5 1.5 0 0 0 10 11.5V14M5 5.5h6M5 8h4",
  pencil: "M10.8 2.7a1.6 1.6 0 0 1 2.3 2.3L6 12.2 2.8 13.2l1-3.2z",
  trash: "M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6A1 1 0 0 0 5.7 14h4.6a1 1 0 0 0 1-.9l.7-8.6",
  calendar: "M3.5 3h9A1.5 1.5 0 0 1 14 4.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-8A1.5 1.5 0 0 1 3.5 3zM2 6.5h12M5.5 1.5v3M10.5 1.5v3",
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
