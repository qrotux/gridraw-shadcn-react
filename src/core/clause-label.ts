import { opArity } from "./arity";
import { formatTemporal } from "./format";
import type { GridMessages } from "./messages";
import type { FilterClause, FilterOp, GridColumn } from "./types";

function opLabel(column: GridColumn | undefined, op: FilterOp): string {
  return column?.filter?.operators.find((o) => o.op === op)?.label ?? op;
}

function enumLabel(column: GridColumn | undefined, value: unknown): string {
  const raw = String(value);
  return column?.filter?.enumValues?.find((e) => e.value === raw)?.label ?? raw;
}

function formatScalar(
  column: GridColumn | undefined,
  value: unknown,
  messages: Required<GridMessages>,
  locale: string,
): string {
  if (column?.type === "enum") return enumLabel(column, value);
  if (column?.type === "boolean") return value ? messages.booleanTrue : messages.booleanFalse;
  // date/time/datetime are localized the same way as their cells (step and all);
  // other types pass through unchanged.
  return formatTemporal(column?.type ?? "string", value, locale, column?.step);
}

function formatValue(
  column: GridColumn | undefined,
  op: FilterOp,
  value: unknown,
  messages: Required<GridMessages>,
  locale: string,
): string {
  const arity = opArity(op);
  if (arity === "range" && Array.isArray(value)) {
    return `${formatScalar(column, value[0], messages, locale)} – ${formatScalar(column, value[1], messages, locale)}`;
  }
  if (arity === "multi" && Array.isArray(value)) {
    return value.map((v) => formatScalar(column, v, messages, locale)).join(", ");
  }
  return formatScalar(column, value, messages, locale);
}

/** Chip text: `<Title> <opLabel> <value>`, labels resolved from the descriptor. */
export function clauseLabel(
  clause: FilterClause,
  columns: GridColumn[],
  messages: Required<GridMessages>,
  locale: string,
): string {
  const column = columns.find((c) => c.key === clause.field);
  const title = column?.title ?? clause.field;
  const label = opLabel(column, clause.op);
  // Value-less operators (isNull, isEmpty…) print just "<Title> <op>".
  if (opArity(clause.op) === "none") return `${title} ${label}`;
  return `${title} ${label} ${formatValue(column, clause.op, clause.value, messages, locale)}`;
}
