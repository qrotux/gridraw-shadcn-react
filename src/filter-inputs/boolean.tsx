import { coerceBoolean } from "../core/coerce";
import { controlClass } from "../ui/control";
import { useGridI18n } from "../messages";

export function BooleanValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  const current = typeof value === "boolean" ? String(value) : "";
  return (
    <select
      value={current}
      onChange={(e) => onChange(coerceBoolean(e.target.value))}
      className={controlClass}
      aria-label={messages.value}
    >
      <option value="">—</option>
      <option value="true">{messages.booleanTrue}</option>
      <option value="false">{messages.booleanFalse}</option>
    </select>
  );
}
