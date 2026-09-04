import type { ColType } from "./core/types";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// A datetime is an instant, shown in the viewer's zone. A date and a time are
// wall-clock values with no zone; formatting them in UTC (the zone they are
// parsed into) keeps the day and the hour exactly as the server sent them.
// `withSeconds` follows the column's step: a sub-minute step keeps the seconds.
function options(kind: "datetime" | "date" | "time", withSeconds: boolean): Intl.DateTimeFormatOptions {
  if (kind === "date") return { dateStyle: "medium", timeZone: "UTC" };
  const timeStyle = withSeconds ? "medium" : "short";
  if (kind === "time") return { timeStyle, timeZone: "UTC" };
  return { dateStyle: "medium", timeStyle, timeZone: TZ };
}
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(
  kind: "datetime" | "date" | "time",
  locale: string,
  withSeconds: boolean,
): Intl.DateTimeFormat {
  const key = `${kind}:${withSeconds}:${locale}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options(kind, withSeconds));
    fmtCache.set(key, f);
  }
  return f;
}

// The wire form of each temporal type parsed to an instant. Date and time are
// anchored on the UTC day so formatting in UTC round-trips them unchanged.
function parse(type: "datetime" | "date" | "time", value: string): Date {
  if (type === "date") return new Date(`${value}T00:00:00Z`);
  if (type === "time") return new Date(`1970-01-01T${value}Z`);
  return new Date(value);
}

/** Localized text for a temporal value, shared by cells and filter chips. Types
 *  other than date/time/datetime, and unparseable values, fall back to the raw
 *  wire string so nothing is ever shown as "Invalid Date". `step` is the
 *  column's resolution in seconds: a sub-minute step keeps the seconds. */
export function formatTemporal(type: ColType, value: unknown, locale: string, step?: number): string {
  if (type !== "date" && type !== "time" && type !== "datetime") return String(value);
  const d = parse(type, String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const withSeconds = type !== "date" && step !== undefined && step % 60 !== 0;
  return formatter(type, locale, withSeconds).format(d);
}
