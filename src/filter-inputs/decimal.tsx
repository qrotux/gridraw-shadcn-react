import { coerceText } from "../core/coerce";
import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

// Decimal values travel as strings ("19.99"), keeping the exact scale; a JS
// number would lose it and the server rejects float-typed decimals. So this
// passes the raw text through unparsed, unlike NumberValueInput.
export function DecimalValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  return (
    <Input
      inputMode="decimal"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      placeholder={messages.number}
      className="h-8 w-28"
    />
  );
}
