import { valueInputSpec } from "../core/value-input-spec";
import type { FilterOp, GridColumn } from "../core/types";
import { BetweenValueInput } from "./between";
import { EnumTagInput } from "./enum-combobox";
import { EnumValueInput } from "./enum-checkboxes";
import { ScalarValueInput } from "./scalar";
import { TagValueInput } from "./tags";

/** Renders the control `valueInputSpec` picked for this column/operator pair;
 *  each control coerces to the wire type. */
export function ValueInput({
  column,
  op,
  value,
  onChange,
}: {
  column: GridColumn;
  op: FilterOp;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const spec = valueInputSpec(column, op);
  switch (spec.kind) {
    case "none":
      return null; // value-less: isNull, isEmpty…
    case "range":
      return <BetweenValueInput field={spec.field} value={value} onChange={onChange} step={column.step} />;
    case "enumCheckboxes":
      return <EnumValueInput options={spec.options} value={value} onChange={onChange} />;
    case "enumTags":
      return <EnumTagInput options={spec.options} value={value} onChange={onChange} strict={spec.strict} />;
    case "tags":
      return <TagValueInput element={spec.element} value={value} onChange={onChange} />;
    case "scalar":
      return <ScalarValueInput field={spec.field} value={value} onChange={onChange} step={column.step} />;
  }
}
