import { Checkbox } from "../ui/checkbox";
import type { EnumValue } from "../core/types";

export function EnumValueInput({
  options,
  value,
  onChange,
}: {
  options: EnumValue[];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];

  function toggle(v: string, checked: boolean) {
    const next = checked ? [...selected, v] : selected.filter((x) => x !== v);
    onChange(next.length > 0 ? next : undefined);
  }

  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(c) => toggle(opt.value, c === true)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
