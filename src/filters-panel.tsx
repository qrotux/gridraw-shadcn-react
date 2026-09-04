import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { controlClass } from "./ui/control";

import { ValueInput, opArity } from "./filter-inputs";
import { formatTemporal } from "./format";
import { useGridI18n, type GridMessages } from "./messages";
import type { FilterClause, FilterOp, GridColumn } from "./core/types";

// ---------------------------------------------------------------------------
// label helpers (used by chips)
// ---------------------------------------------------------------------------

function opLabel(column: GridColumn | undefined, op: FilterOp): string {
  return column?.filter?.operators.find((o) => o.op === op)?.label ?? op;
}

// Default operator on column selection: string columns prefer "contains"
// (the most common intent) when available, otherwise the first listed.
function defaultOp(column: GridColumn): FilterOp | "" {
  const ops = column.filter?.operators ?? [];
  if (column.type === "string" && ops.some((o) => o.op === "contains")) return "contains";
  return ops[0]?.op ?? "";
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

// ---------------------------------------------------------------------------
// clause editor — column select → operator select → value input → commit
// ---------------------------------------------------------------------------

function ClauseEditor({
  columns,
  initial,
  initialField,
  onCommit,
  onCancel,
}: {
  columns: GridColumn[];
  initial?: FilterClause; // set = edit mode, fields pre-filled
  initialField?: string; // preselected column in add mode (header filter icon)
  onCommit: (clause: FilterClause) => void;
  onCancel: () => void;
}) {
  const { messages } = useGridI18n();
  const filterable = React.useMemo(() => columns.filter((c) => c.filter), [columns]);
  // initialField seeds only a filterable column; op is that column's default.
  const seedCol = initialField ? filterable.find((c) => c.key === initialField) : undefined;
  const [field, setField] = React.useState(initial?.field ?? (seedCol ? seedCol.key : ""));
  const [op, setOp] = React.useState<FilterOp | "">(initial?.op ?? (seedCol ? defaultOp(seedCol) : ""));
  const [draft, setDraft] = React.useState<unknown>(initial?.value);

  const column = filterable.find((c) => c.key === field);
  const operators = column?.filter?.operators ?? [];

  function selectField(key: string) {
    setField(key);
    const col = filterable.find((c) => c.key === key);
    setOp(col ? defaultOp(col) : "");
    setDraft(undefined);
  }

  function selectOp(next: string) {
    const nextOp = next as FilterOp;
    // Keep the entered value when the new operator carries the same value shape
    // (e.g. containsAny → containsAll, or between → notBetween); reset only when
    // the shape changes (scalar ↔ range ↔ multi ↔ value-less).
    if (op === "" || opArity(nextOp) !== opArity(op)) setDraft(undefined);
    setOp(nextOp);
  }

  // Value-less operators commit without a draft; everything else needs one.
  const noValue = op !== "" && opArity(op) === "none";
  const canCommit = column !== undefined && op !== "" && (noValue || draft !== undefined);

  function commit() {
    if (column === undefined || op === "") return;
    if (!noValue && draft === undefined) return;
    onCommit({ field: column.key, op, value: noValue ? null : draft });
    setField("");
    setOp("");
    setDraft(undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
      <select
        value={field}
        onChange={(e) => selectField(e.target.value)}
        className={controlClass}
        aria-label={messages.columnAria}
      >
        <option value="">{messages.columnPlaceholder}</option>
        {filterable.map((c) => (
          <option key={c.key} value={c.key}>
            {c.title}
          </option>
        ))}
      </select>

      {column && (
        <select
          value={op}
          onChange={(e) => selectOp(e.target.value)}
          className={controlClass}
          aria-label={messages.operatorAria}
        >
          {operators.map((o) => (
            <option key={o.op} value={o.op}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {column && op !== "" && !noValue && (
        <ValueInput
          key={`${field}:${opArity(op)}`}
          column={column}
          op={op}
          value={draft}
          onChange={setDraft}
        />
      )}

      <Button size="sm" onClick={commit} disabled={!canCommit}>
        {initial ? messages.save : messages.add}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        {messages.cancel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// chip + AND-group row
// ---------------------------------------------------------------------------

function Chip({
  clause,
  columns,
  onEdit,
  onRemove,
}: {
  clause: FilterClause;
  columns: GridColumn[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { messages, locale } = useGridI18n();
  return (
    <Badge variant="chip">
      <button
        type="button"
        aria-label={messages.editClauseAria}
        onClick={onEdit}
        className="rounded hover:underline"
      >
        {clauseLabel(clause, columns, messages, locale)}
      </button>
      <button
        type="button"
        aria-label={messages.removeClauseAria}
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

// Target of the open editor: new OR-group | append to a group | edit an
// existing clause (chip click).
type EditTarget =
  | { kind: "new"; column?: string } // column set = preselect (header filter icon)
  | { kind: "append"; groupIndex: number }
  | { kind: "edit"; groupIndex: number; clauseIndex: number };

function GroupRow({
  columns,
  group,
  groupIndex,
  editing,
  onEditClause,
  onRemoveClause,
  onOpenAppend,
  onCommit,
  onCancel,
}: {
  columns: GridColumn[];
  group: FilterClause[];
  groupIndex: number;
  editing: EditTarget | null;
  onEditClause: (clauseIndex: number) => void;
  onRemoveClause: (clauseIndex: number) => void;
  onOpenAppend: () => void;
  onCommit: (clause: FilterClause) => void;
  onCancel: () => void;
}) {
  const { messages } = useGridI18n();
  const appendOpen = editing?.kind === "append" && editing.groupIndex === groupIndex;
  const editorOpenHere =
    (editing?.kind === "append" || editing?.kind === "edit") && editing.groupIndex === groupIndex;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      {group.map((clause, ci) => {
        const editOpen =
          editing?.kind === "edit" && editing.groupIndex === groupIndex && editing.clauseIndex === ci;
        return editOpen ? (
          // the editor replaces the chip, pre-filled with this clause
          <ClauseEditor key={ci} columns={columns} initial={clause} onCommit={onCommit} onCancel={onCancel} />
        ) : (
          <Chip
            key={ci}
            clause={clause}
            columns={columns}
            onEdit={() => onEditClause(ci)}
            onRemove={() => onRemoveClause(ci)}
          />
        );
      })}
      {appendOpen ? (
        <ClauseEditor columns={columns} onCommit={onCommit} onCancel={onCancel} />
      ) : (
        !editorOpenHere && (
          <Button variant="ghost" size="sm" onClick={onOpenAppend}>
            {messages.filter}
          </Button>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FiltersPanel — DNF: outer array = OR-groups, inner array = AND-clauses.
// Empty groups are impossible by construction: removing a group's last
// clause drops the whole group (never emits an empty inner array).
// ---------------------------------------------------------------------------

/** Imperative handle: the toolbar "+ Or group" button and the header filter
 *  icon open the new-group editor here. Optional `column` preselects it. */
export type FiltersPanelHandle = { openAddGroup: (column?: string) => void };

export const FiltersPanel = React.forwardRef<
  FiltersPanelHandle,
  {
    columns: GridColumn[];
    value: FilterClause[][];
    onChange: (v: FilterClause[][]) => void;
  }
>(function FiltersPanel({ columns, value, onChange }, ref) {
  const { messages } = useGridI18n();
  const [editing, setEditing] = React.useState<EditTarget | null>(null);

  React.useImperativeHandle(
    ref,
    () => ({ openAddGroup: (column) => setEditing({ kind: "new", column }) }),
    [],
  );

  function removeClause(groupIndex: number, clauseIndex: number) {
    const nextGroups = value
      .map((group, gi) => (gi === groupIndex ? group.filter((_, ci) => ci !== clauseIndex) : group))
      .filter((group) => group.length > 0);
    // Removal shifts positional indexes (group/clause), so any open editor is
    // closed rather than re-targeted.
    setEditing(null);
    onChange(nextGroups);
  }

  function commitClause(clause: FilterClause) {
    if (editing === null) return;
    if (editing.kind === "new") {
      onChange([...value, [clause]]);
    } else if (editing.kind === "append") {
      const gi = editing.groupIndex;
      onChange(value.map((group, i) => (i === gi ? [...group, clause] : group)));
    } else {
      const { groupIndex: gi, clauseIndex: ci } = editing;
      // in-place edit: replace the clause, do not append
      onChange(value.map((group, i) => (i === gi ? group.map((c, j) => (j === ci ? clause : c)) : group)));
    }
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="text-xs font-medium text-muted-foreground">{messages.or}</div>}
          <GroupRow
            columns={columns}
            group={group}
            groupIndex={gi}
            editing={editing}
            onEditClause={(ci) => setEditing({ kind: "edit", groupIndex: gi, clauseIndex: ci })}
            onRemoveClause={(ci) => removeClause(gi, ci)}
            onOpenAppend={() => setEditing({ kind: "append", groupIndex: gi })}
            onCommit={commitClause}
            onCancel={() => setEditing(null)}
          />
        </React.Fragment>
      ))}

      {editing?.kind === "new" && (
        <>
          {value.length > 0 && <div className="text-xs font-medium text-muted-foreground">{messages.or}</div>}
          <ClauseEditor
            columns={columns}
            initialField={editing.column}
            onCommit={commitClause}
            onCancel={() => setEditing(null)}
          />
        </>
      )}
    </div>
  );
});
