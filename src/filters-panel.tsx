import * as React from "react";
import { X } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/cn";

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
): string {
  if (column?.type === "enum") return enumLabel(column, value);
  if (column?.type === "boolean") return value ? messages.booleanTrue : messages.booleanFalse;
  return String(value);
}

function formatValue(
  column: GridColumn | undefined,
  op: FilterOp,
  value: unknown,
  messages: Required<GridMessages>,
): string {
  if (op === "between" && Array.isArray(value)) {
    return `${formatScalar(column, value[0], messages)} – ${formatScalar(column, value[1], messages)}`;
  }
  if (op === "in" && Array.isArray(value)) {
    return value.map((v) => enumLabel(column, v)).join(", ");
  }
  return formatScalar(column, value, messages);
}

/** Chip text: `<Title> <opLabel> <value>`, labels resolved from the descriptor. */
export function clauseLabel(
  clause: FilterClause,
  columns: GridColumn[],
  messages: Required<GridMessages>,
): string {
  const column = columns.find((c) => c.key === clause.field);
  const title = column?.title ?? clause.field;
  return `${title} ${opLabel(column, clause.op)} ${formatValue(column, clause.op, clause.value, messages)}`;
}

// ---------------------------------------------------------------------------
// value inputs — one per column-type/op combination, each coercing to the
// wire type on every change (gridraw-go rejects string-typed numbers/bools).
// ---------------------------------------------------------------------------

function TextValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      placeholder={messages.value}
      className="h-8 w-40"
    />
  );
}

function NumberValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: number | undefined) => void;
}) {
  const { messages } = useGridI18n();
  const [raw, setRaw] = React.useState(typeof value === "number" ? String(value) : "");

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setRaw(text);
    if (text.trim() === "") {
      onChange(undefined);
      return;
    }
    const n = Number(text);
    onChange(Number.isNaN(n) ? undefined : n);
  }

  return (
    <Input type="number" value={raw} onChange={handle} placeholder={messages.number} className="h-8 w-28" />
  );
}

// ISO (UTC) to local "YYYY-MM-DDTHH:mm" for pre-filling datetime-local when
// editing an existing clause.
function isoToLocalInput(value: unknown): string {
  if (typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DatetimeValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
}) {
  const { messages } = useGridI18n();
  const [raw, setRaw] = React.useState(() => isoToLocalInput(value));

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setRaw(text);
    if (!text) {
      onChange(undefined);
      return;
    }
    const d = new Date(text);
    onChange(Number.isNaN(d.getTime()) ? undefined : d.toISOString());
  }

  return (
    <input
      type="datetime-local"
      value={raw}
      onChange={handle}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
      aria-label={messages.value}
    />
  );
}

function BooleanValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  const current = typeof value === "boolean" ? String(value) : "";
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "true")}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
      aria-label={messages.value}
    >
      <option value="">—</option>
      <option value="true">{messages.booleanTrue}</option>
      <option value="false">{messages.booleanFalse}</option>
    </select>
  );
}

function EnumValueInput({
  column,
  value,
  onChange,
}: {
  column: GridColumn;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const options = column.filter?.enumValues ?? [];

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

function BetweenValueInput({
  column,
  value,
  onChange,
}: {
  column: GridColumn;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  // Both sides live in local state, seeded once from `value` (ClauseEditor
  // remounts this input via its `${field}:${op}` key). They cannot be derived
  // from the `value` prop: while only one side is filled, onChange emits
  // `undefined` every keystroke, React bails out of the parent's identical
  // setState, and no re-render brings the other side's latest entry back.
  const initial = Array.isArray(value) ? (value as [unknown, unknown]) : [undefined, undefined];
  const [a, setA] = React.useState<unknown>(initial[0]);
  const [b, setB] = React.useState<unknown>(initial[1]);

  function commit(na: unknown, nb: unknown) {
    onChange(na !== undefined && nb !== undefined ? [na, nb] : undefined);
  }

  function handleA(v: unknown) {
    setA(v);
    commit(v, b);
  }

  function handleB(v: unknown) {
    setB(v);
    commit(a, v);
  }

  const Field = column.type === "datetime" ? DatetimeValueInput : NumberValueInput;

  return (
    <div className="flex items-center gap-1">
      <Field value={a} onChange={handleA} />
      <span className="text-xs text-muted-foreground">–</span>
      <Field value={b} onChange={handleB} />
    </div>
  );
}

/** Picks the value input by column type / operator; each coerces to the wire type. */
function ValueInput({
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
  if (op === "between") return <BetweenValueInput column={column} value={value} onChange={onChange} />;
  if (op === "in") return <EnumValueInput column={column} value={value} onChange={onChange} />;

  switch (column.type) {
    case "number":
      return <NumberValueInput value={value} onChange={onChange} />;
    case "boolean":
      return <BooleanValueInput value={value} onChange={onChange} />;
    case "datetime":
      return <DatetimeValueInput value={value} onChange={onChange} />;
    default:
      return <TextValueInput value={value} onChange={onChange} />;
  }
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
    setOp(next as FilterOp);
    setDraft(undefined);
  }

  const canCommit = column !== undefined && op !== "" && draft !== undefined;

  function commit() {
    if (column === undefined || op === "") return;
    if (draft === undefined) return;
    onCommit({ field: column.key, op, value: draft });
    setField("");
    setOp("");
    setDraft(undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
      <select
        value={field}
        onChange={(e) => selectField(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
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
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
          aria-label={messages.operatorAria}
        >
          {operators.map((o) => (
            <option key={o.op} value={o.op}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {column && op !== "" && (
        <ValueInput key={`${field}:${op}`} column={column} op={op} value={draft} onChange={setDraft} />
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
  const { messages } = useGridI18n();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
      <button
        type="button"
        aria-label={messages.editClauseAria}
        onClick={onEdit}
        className="rounded hover:underline"
      >
        {clauseLabel(clause, columns, messages)}
      </button>
      <button
        type="button"
        aria-label={messages.removeClauseAria}
        onClick={onRemove}
        className={cn(
          "rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <X className="size-3" />
      </button>
    </span>
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
