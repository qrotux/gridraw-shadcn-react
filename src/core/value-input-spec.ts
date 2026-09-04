import { opArity } from "./arity";
import type { ColType, EnumValue, FilterOp, GridColumn } from "./types";

// filter.widget values understood for multi-value enum columns. Anything else
// (including the absent default) uses the checkbox list.
const WIDGET_TAGS = "tags"; // autocomplete restricted to the enum values
const WIDGET_COMBOBOX = "combobox"; // enum values as suggestions, free entry allowed

/** The single-value control a scalar of this type is entered with. */
export type ScalarInputKind = "text" | "number" | "decimal" | "boolean" | "date" | "time" | "datetime";

/** Which control the clause editor renders for a column/operator pair. A UI
 *  layer maps every case to its own widgets; the decision itself is shared. */
export type ValueInputSpec =
  | { kind: "none" } // value-less operator
  | { kind: "scalar"; field: ScalarInputKind }
  | { kind: "range"; field: ScalarInputKind } // between/notBetween, both ends alike
  | { kind: "enumCheckboxes"; options: EnumValue[] }
  | { kind: "enumTags"; options: EnumValue[]; strict: boolean }
  | { kind: "tags"; element: ColType }; // free multi-value entry

export function scalarInputKind(type: ColType): ScalarInputKind {
  switch (type) {
    case "number":
      return "number";
    case "decimal":
      return "decimal";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    case "time":
      return "time";
    case "datetime":
      return "datetime";
    // uuid, enum and json fall through to text: typed exactly, no picker.
    default:
      return "text";
  }
}

// Both ends of a range share one control. The server offers between only on
// ordered columns, so anything not temporal or decimal is entered as a number —
// a text field would accept values the operator cannot compare.
function rangeFieldKind(type: ColType): ScalarInputKind {
  const kind = scalarInputKind(type);
  return kind === "datetime" || kind === "time" || kind === "date" || kind === "decimal" ? kind : "number";
}

export function valueInputSpec(column: GridColumn, op: FilterOp): ValueInputSpec {
  const arity = opArity(op);
  if (arity === "none") return { kind: "none" };
  if (arity === "range") return { kind: "range", field: rangeFieldKind(column.type) };
  if (arity === "multi") {
    // in/notIn and the array operators: enum columns pick from their values,
    // columns without any (uuid, non-enum arrays) take free tag entry.
    const options = column.filter?.enumValues ?? [];
    if (options.length === 0) return { kind: "tags", element: column.type };
    const widget = column.filter?.widget;
    if (widget === WIDGET_TAGS) return { kind: "enumTags", options, strict: true };
    if (widget === WIDGET_COMBOBOX) return { kind: "enumTags", options, strict: false };
    return { kind: "enumCheckboxes", options };
  }
  return { kind: "scalar", field: scalarInputKind(column.type) };
}
