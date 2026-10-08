export const APPEARANCES = ["paper", "midnight", "lavender"] as const;
export type Appearance = (typeof APPEARANCES)[number];
const APPEARANCE_KEY = "urbanscan.appearance";
export function readAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    return APPEARANCES.find((appearance) => appearance === stored) ?? "paper";
  } catch {
    return "paper";
  }
}
export function saveAppearance(appearance: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, appearance);
  } catch {
    /* Restricted storage must not stop the studio from working. */
  }
}
