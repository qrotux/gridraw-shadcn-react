import { coerceText } from "../core/coerce";
import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

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
  return (
    <Input
      type="time"
      step={step}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      className="h-8 w-auto px-2 text-sm"
      aria-label={messages.value}
    />
  );
}
