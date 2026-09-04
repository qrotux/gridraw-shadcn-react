import * as React from "react";

import { coerceDatetimeLocal, datetimeLocalFromIso } from "../core/coerce";
import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

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
  // Local state: the value on the wire is an instant in UTC, so deriving the
  // field back from it would fight the user mid-edit.
  const [raw, setRaw] = React.useState(() => datetimeLocalFromIso(value));

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    onChange(coerceDatetimeLocal(e.target.value));
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
