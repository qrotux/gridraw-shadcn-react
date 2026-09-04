import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceText } from "../core/coerce";

// A native time picker. `step` (seconds) sets the granularity and whether the
// seconds field appears; the input's value ("HH:MM" or "HH:MM:SS") is already
// the wire form, so it passes through unchanged.
export function TimeValueInput({
  value,
  onChange,
  step,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
  step?: number;
}) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Input } = components;
  return (
    <Input
      type="time"
      step={step}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      className={cn("h-8 w-auto px-2 text-sm", classNames.valueInput)}
      aria-label={messages.value}
    />
  );
}
