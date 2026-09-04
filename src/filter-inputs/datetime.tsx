import * as React from "react";

import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

// ISO (UTC) to local "YYYY-MM-DDTHH:mm" for pre-filling datetime-local when
// editing an existing clause.
function isoToLocalInput(value: unknown): string {
  if (typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DatetimeValueInput({
  value,
  onChange,
  step,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
  step?: number; // column resolution in seconds; drives the input's precision
}) {
  const { messages } = useGridI18n();
  const [raw, setRaw] = React.useState(() => isoToLocalInput(value));

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setRaw(text);
    if (!text) {
      onChange(undefined);
      return;
    }
    const d = new Date(text);
    onChange(Number.isNaN(d.getTime()) ? undefined : d.toISOString());
  }

  return (
    <Input
      type="datetime-local"
      step={step}
      value={raw}
      onChange={handle}
      className="h-8 w-auto px-2 text-sm"
      aria-label={messages.value}
    />
  );
}
