import { opArity } from "./arity";
import type { FilterClause, FilterOp, GridColumn } from "./types";

/** Operator preselected when a column is picked: string columns prefer
 *  "contains" (the most common intent) when offered, otherwise the first
 *  listed. `""` when the column carries no operators. */
export function defaultOp(column: GridColumn): FilterOp | "" {
  const ops = column.filter?.operators ?? [];
  if (column.type === "string" && ops.some((o) => o.op === "contains")) return "contains";
  return ops[0]?.op ?? "";
}

/** Whether a draft value survives an operator change: the shape is the arity, so
 *  containsAny → containsAll keeps the entered values, between → eq does not. */
export function keepsValueShape(prev: FilterOp | "", next: FilterOp): boolean {
  return prev !== "" && opArity(prev) === opArity(next);
}

/** Whether the editor may commit: a column, an operator, and a draft value
 *  unless the operator is value-less (isNull, isEmpty…). */
export function canCommitClause(column: GridColumn | undefined, op: FilterOp | "", draft: unknown): boolean {
  if (column === undefined || op === "") return false;
  return opArity(op) === "none" || draft !== undefined;
}

/** The clause to emit, or undefined when the draft is not commitable.
 *  Value-less operators commit `value: null`. */
export function buildClause(
  column: GridColumn | undefined,
  op: FilterOp | "",
  draft: unknown,
): FilterClause | undefined {
  if (!canCommitClause(column, op, draft) || column === undefined || op === "") return undefined;
  return { field: column.key, op, value: opArity(op) === "none" ? null : draft };
}
