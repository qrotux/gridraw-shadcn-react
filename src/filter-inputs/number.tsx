import * as React from "react";

import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceNumber } from "../core/coerce";

export function NumberValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: number | undefined) => void;
}) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Input } = components;
  // The typed text is local state: coercion drops what is not yet a number
  // ("-", "1e"), and re-deriving the field from the coerced value would erase
  // those keystrokes.
  const [raw, setRaw] = React.useState(typeof value === "number" ? String(value) : "");

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    onChange(coerceNumber(e.target.value));
  }

  return (
    <Input
      type="number"
      value={raw}
      onChange={handle}
      placeholder={messages.number}
      className={cn("h-8 w-28", classNames.valueInput)}
    />
  );
}
