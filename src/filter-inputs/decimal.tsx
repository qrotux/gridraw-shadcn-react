import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceText } from "../core/coerce";

// Decimal values travel as strings ("19.99"), keeping the exact scale; a JS
// number would lose it and the server rejects float-typed decimals. So this
// passes the raw text through unparsed, unlike NumberValueInput.
export function DecimalValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Input } = components;
  return (
    <Input
      inputMode="decimal"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      placeholder={messages.number}
      className={cn("h-8 w-28", classNames.valueInput)}
    />
  );
}
