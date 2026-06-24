import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings, resolving conflicts (last wins) — the standard
 * shadcn helper. Lets components expose a `className` prop that cleanly
 * overrides their defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
