import type { FilterOp } from "../core/types";

// The kind of value an operator carries. One classification drives the input
// component, the commit guard and the chip label, so a new operator only has to
// be listed here.
//   none   isNull/isNotNull/isEmpty/isNotEmpty — no value
//   range  between/notBetween — [a, b]
//   multi  in/notIn and the array operators — an array of values
//   scalar everything else — one value of the column type
export type OpArity = "none" | "range" | "multi" | "scalar";

const NO_VALUE_OPS = new Set<FilterOp>(["isNull", "isNotNull", "isEmpty", "isNotEmpty"]);
const RANGE_OPS = new Set<FilterOp>(["between", "notBetween"]);
const MULTI_OPS = new Set<FilterOp>([
  "in",
  "notIn",
  "containsAny",
  "containsAll",
  "containsOnly",
  "notContainsAny",
]);

export function opArity(op: FilterOp): OpArity {
  if (NO_VALUE_OPS.has(op)) return "none";
  if (RANGE_OPS.has(op)) return "range";
  if (MULTI_OPS.has(op)) return "multi";
  return "scalar";
}
