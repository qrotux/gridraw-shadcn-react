import * as React from "react";

import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceDatetimeLocal, datetimeLocalFromIso } from "../core/coerce";

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
  const { components, classNames } = useGridUi();
  const { Input } = components;
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
      className={cn("h-8 w-auto px-2 text-sm", classNames.valueInput)}
      aria-label={messages.value}
    />
  );
}
