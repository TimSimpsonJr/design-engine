// Originally from bitjaru/styleseed (MIT) — see /LICENSE for full attribution.
// Ported to design-engine plugin under MIT.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
