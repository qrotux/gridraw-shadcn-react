import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceText } from "../core/coerce";

// A native date picker whose value is already the "YYYY-MM-DD" wire form, so no
// conversion is needed (unlike datetime, which round-trips through a zone).
export function DateValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
}) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Input } = components;
  return (
    <Input
      type="date"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      className={cn("h-8 w-auto px-2 text-sm", classNames.valueInput)}
      aria-label={messages.value}
    />
  );
}
