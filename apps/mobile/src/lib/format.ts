/** Small formatting helpers shared across screens. */

/** Format money in the app's display currency (USD major units). */
export function money(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : "";
  return (
    sign +
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    })
  );
}

/** Compact money for chart centers ("$1.2k"). */
export function moneyCompact(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** A "yyyy-mm" key for a given Date (defaults to now). */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The "yyyy-mm" key for the month before `month`. */
export function previousMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date((y ?? 1970), (m ?? 1) - 2, 1);
  return monthKey(date);
}

/** Human month label, e.g. "June 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date((y ?? 1970), (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Short month label for chart axes, e.g. "Jun". */
export function shortMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date((y ?? 1970), (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

/** Group a list by a key function, preserving insertion order. */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const arr = out.get(k);
    if (arr) arr.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/** Pretty date header, e.g. "Today", "Yesterday", or "Mon, Jun 23". */
export function dateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
