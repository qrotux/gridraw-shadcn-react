import type { ColType } from "./types";

// Every value input turns the text a user typed into the wire value the Go
// backend expects, and an empty field always means "no value" (undefined), not
// an empty string: the commit guard reads undefined as "nothing entered yet".

/** Trimmed-of-nothing passthrough for the types whose input value is already the
 *  wire form: string, uuid, json, decimal (a string, keeping the exact scale)
 *  and the native date/time pickers ("YYYY-MM-DD", "HH:MM(:SS)"). */
export function coerceText(raw: string): string | undefined {
  return raw === "" ? undefined : raw;
}

/** A JS number; the server rejects string-typed numbers. */
export function coerceNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** The "true"/"false" of a select; anything else clears the value. */
export function coerceBoolean(raw: string): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** The local wall-clock text of a `datetime-local` input to an RFC 3339 instant. */
export function coerceDatetimeLocal(raw: string): string | undefined {
  if (raw === "") return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** The inverse, for pre-filling `datetime-local` when editing a clause: an ISO
 *  instant as local "YYYY-MM-DDTHH:mm". Unparseable values give "". */
export function datetimeLocalFromIso(value: unknown): string {
  if (typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One element of a multi-value operator, typed by the column's element type:
 *  numbers go on the wire as numbers, everything else (uuid, decimal, enum) as
 *  the typed text. Returning undefined rejects the token. */
export function coerceElement(type: ColType, raw: string): unknown {
  return type === "number" ? coerceNumber(raw) : coerceText(raw);
}
