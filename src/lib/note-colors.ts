/** Highlight colours a reader can give a note. Each paints with the CSS highlights named in globals.css. */
export const NOTE_COLORS = [
  { id: "yellow", label: "Yellow", swatch: "#FFCC00" },
  { id: "green", label: "Green", swatch: "#34C759" },
  { id: "blue", label: "Blue", swatch: "#0A84FF" },
  { id: "pink", label: "Pink", swatch: "#FF2D55" },
  { id: "purple", label: "Purple", swatch: "#AF52DE" },
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number]["id"];
export const DEFAULT_COLOR: NoteColor = "yellow";
export const isNoteColor = (v: unknown): v is NoteColor => NOTE_COLORS.some((c) => c.id === v);
export const swatchOf = (c: NoteColor) => NOTE_COLORS.find((x) => x.id === c)!.swatch;
