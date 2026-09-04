import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

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
  return (
    <Input
      type="date"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="h-8 w-auto px-2 text-sm"
      aria-label={messages.value}
    />
  );
}
