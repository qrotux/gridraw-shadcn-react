import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceText } from "../core/coerce";

export function TextValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Input } = components;
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(coerceText(e.target.value))}
      placeholder={messages.value}
      className={cn("h-8 w-40", classNames.valueInput)}
    />
  );
}
