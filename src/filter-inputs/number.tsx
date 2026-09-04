import * as React from "react";

import { coerceNumber } from "../core/coerce";
import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

export function NumberValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: number | undefined) => void;
}) {
  const { messages } = useGridI18n();
  // The typed text is local state: coercion drops what is not yet a number
  // ("-", "1e"), and re-deriving the field from the coerced value would erase
  // those keystrokes.
  const [raw, setRaw] = React.useState(typeof value === "number" ? String(value) : "");

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    onChange(coerceNumber(e.target.value));
  }

  return (
    <Input type="number" value={raw} onChange={handle} placeholder={messages.number} className="h-8 w-28" />
  );
}
