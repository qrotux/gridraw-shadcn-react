import type { FilterOp, GridColumn } from "../core/types";
import { opArity } from "./arity";
import { BetweenValueInput } from "./between";
import { BooleanValueInput } from "./boolean";
import { DateValueInput } from "./date";
import { DatetimeValueInput } from "./datetime";
import { DecimalValueInput } from "./decimal";
import { EnumTagInput } from "./enum-combobox";
import { EnumValueInput } from "./enum-checkboxes";
import { NumberValueInput } from "./number";
import { TagValueInput } from "./tags";
import { TextValueInput } from "./text";
import { TimeValueInput } from "./time";

// filter.widget values understood for multi-value enum columns. Anything else
// (including the absent default) uses the checkbox list.
const WIDGET_TAGS = "tags"; // autocomplete restricted to the enum values
const WIDGET_COMBOBOX = "combobox"; // enum values as suggestions, free entry allowed

/** Picks the value input by column type / operator; each coerces to the wire type. */
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
  const arity = opArity(op);
  if (arity === "none") return null; // value-less: isNull, isEmpty…
  if (arity === "range") return <BetweenValueInput column={column} value={value} onChange={onChange} />;
  // multi (in/notIn, array operators): enum columns pick from a checkbox list;
  // columns with no enum values (uuid, non-enum arrays) take free tag entry.
  if (arity === "multi") {
    const enumValues = column.filter?.enumValues ?? [];
    if (enumValues.length > 0) {
      // The widget hint chooses the enum input; the default stays checkboxes.
      const widget = column.filter?.widget;
      if (widget === WIDGET_TAGS)
        return <EnumTagInput options={enumValues} value={value} onChange={onChange} strict />;
      if (widget === WIDGET_COMBOBOX)
        return <EnumTagInput options={enumValues} value={value} onChange={onChange} strict={false} />;
      return <EnumValueInput column={column} value={value} onChange={onChange} />;
    }
    // number elements go on the wire as numbers; a non-numeric token is
    // rejected. decimal stays a string (like the scalar decimal input).
    const parse =
      column.type === "number"
        ? (raw: string) => {
            const n = Number(raw);
            return Number.isNaN(n) ? undefined : n;
          }
        : undefined;
    return <TagValueInput value={value} onChange={onChange} parse={parse} />;
  }

  switch (column.type) {
    case "number":
      return <NumberValueInput value={value} onChange={onChange} />;
    case "decimal":
      return <DecimalValueInput value={value} onChange={onChange} />;
    case "boolean":
      return <BooleanValueInput value={value} onChange={onChange} />;
    case "date":
      return <DateValueInput value={value} onChange={onChange} />;
    case "time":
      return <TimeValueInput value={value} onChange={onChange} step={column.step} />;
    case "datetime":
      return <DatetimeValueInput value={value} onChange={onChange} step={column.step} />;
    // uuid falls through to text: it is typed exactly, no picker.
    default:
      return <TextValueInput value={value} onChange={onChange} />;
  }
}
