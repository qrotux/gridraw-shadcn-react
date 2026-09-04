import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import { coerceBoolean } from "../core/coerce";

export function BooleanValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Select } = components;
  return (
    <Select
      value={typeof value === "boolean" ? String(value) : ""}
      onValueChange={(v) => onChange(coerceBoolean(v))}
      // The "—" empty glyph is language-neutral and intentionally not a message key.
      placeholder="—"
      options={[
        { value: "true", label: messages.booleanTrue },
        { value: "false", label: messages.booleanFalse },
      ]}
      ariaLabel={messages.value}
      className={classNames.valueInput}
    />
  );
}
