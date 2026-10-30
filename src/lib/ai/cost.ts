import { MODES, type Mode } from "@/lib/ai/modes";

/** Longest question, in characters. */
export const MAX_QUESTION = 4000;

/**
 * Notify Credits one message costs: 1 for a short question, more as the attached text (files, cases, topics) gets longer,
 * and one more for a mock exam. The page estimates it before sending; the server charges it from the text actually sent.
 */
export function messageCost(attachedChars: number, mode: Mode = "ask") {
  const tier = attachedChars <= 8_000 ? 1 : attachedChars <= 30_000 ? 2 : attachedChars <= 60_000 ? 3 : 4;
  return tier + MODES[mode].extra;
}
