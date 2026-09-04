import * as React from "react";
import { ChevronsUpDown, X } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/cn";

import { formatTemporal } from "./format";
import { useGridI18n, type GridMessages } from "./messages";
import type { EnumValue, FilterClause, FilterOp, GridColumn } from "./core/types";

// filter.widget values this panel understands for multi-value enum columns.
// Anything else (including the absent default) uses the checkbox list.
const WIDGET_TAGS = "tags"; // autocomplete restricted to the enum values
const WIDGET_COMBOBOX = "combobox"; // enum values as suggestions, free entry allowed

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

// The kind of value an operator carries. One classification drives the input
// component, the commit guard and the chip label, so a new operator only has to
// be listed here.
//   none   isNull/isNotNull/isEmpty/isNotEmpty — no value
//   range  between/notBetween — [a, b]
//   multi  in/notIn and the array operators — an array of values
//   scalar everything else — one value of the column type
type OpArity = "none" | "range" | "multi" | "scalar";
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

// Decimal values travel as strings ("19.99"), keeping the exact scale; a JS
// number would lose it and the server rejects float-typed decimals. So this
// passes the raw text through unparsed, unlike NumberValueInput.
function DecimalValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  return (
    <Input
      inputMode="decimal"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      placeholder={messages.number}
      className="h-8 w-28"
    />
  );
}

// A native date picker whose value is already the "YYYY-MM-DD" wire form, so no
// conversion is needed (unlike datetime, which round-trips through a zone).
function DateValueInput({ value, onChange }: { value: unknown; onChange: (v: string | undefined) => void }) {
  const { messages } = useGridI18n();
  return (
    <input
      type="date"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
      aria-label={messages.value}
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
  step,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
  step?: number; // column resolution in seconds; drives the input's precision
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
      step={step}
      value={raw}
      onChange={handle}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
      aria-label={messages.value}
    />
  );
}

// A native time picker. `step` (seconds) sets the granularity and whether the
// seconds field appears; the input's value ("HH:MM" or "HH:MM:SS") is already
// the wire form, so it passes through unchanged.
function TimeValueInput({
  value,
  onChange,
  step,
}: {
  value: unknown;
  onChange: (v: string | undefined) => void;
  step?: number;
}) {
  const { messages } = useGridI18n();
  return (
    <input
      type="time"
      step={step}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
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

// Free multi-value entry for columns with no enum list (a uuid `in`, and later
// non-enum array columns). A token is added with Enter or comma; Backspace on
// an empty field removes the last. A half-typed token that was never added is
// dropped, exactly as an unchecked box would be — commit only sees added ones.
function TagValueInput({
  value,
  onChange,
  parse,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  // Coerces a typed token to its wire element (e.g. a number). Returning
  // undefined rejects the token. Defaults to the trimmed string.
  parse?: (raw: string) => unknown;
}) {
  const { messages } = useGridI18n();
  const tags = Array.isArray(value) ? (value as unknown[]) : [];
  const [draft, setDraft] = React.useState("");

  function add() {
    const raw = draft.trim();
    setDraft("");
    if (!raw) return;
    const v = parse ? parse(raw) : raw;
    if (v === undefined || tags.some((t) => t === v)) return;
    onChange([...tags, v]);
  }

  function removeAt(i: number) {
    const next = tags.filter((_, j) => j !== i);
    onChange(next.length > 0 ? next : undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
        >
          {String(t)}
          <button
            type="button"
            aria-label={messages.removeValue}
            onClick={() => removeAt(i)}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            removeAt(tags.length - 1);
          }
        }}
        placeholder={messages.value}
        className="h-8 w-40"
      />
    </div>
  );
}

// Enum multi-value entry as a tag field with autocomplete over the enum values
// (a `tags`/`combobox` widget hint), instead of a checkbox list. `strict` keeps
// only values from `options`; otherwise a token matching none is kept verbatim,
// so the options act as suggestions. Chips show the label; the wire keeps the
// value.
// Enum multi-value entry as a select-style combobox: selected values show as
// chips, and typing filters a dropdown of the enum values that the user picks
// from (mouse or keyboard). `strict` keeps only values from `options`; free
// mode also accepts a typed value that matches none, so the options act as
// suggestions. The dropdown is a plain inline panel, not a popover overlay.
function EnumTagInput({
  options,
  value,
  onChange,
  strict,
}: {
  options: EnumValue[];
  value: unknown;
  onChange: (v: unknown) => void;
  strict: boolean;
}) {
  const { messages } = useGridI18n();
  // Memoized so the matches useMemo below is not invalidated every render by a
  // fresh `[]` when value is undefined.
  const selected = React.useMemo<string[]>(() => (Array.isArray(value) ? (value as string[]) : []), [value]);
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  // Unselected options whose label or value matches the current draft.
  const matches = React.useMemo(() => {
    const t = draft.trim().toLowerCase();
    return options.filter(
      (o) =>
        !selected.includes(o.value) &&
        (t === "" || o.label.toLowerCase().includes(t) || o.value.toLowerCase().includes(t)),
    );
  }, [options, selected, draft]);

  // Close when focus leaves the whole control (click elsewhere).
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function addValue(v: string) {
    setDraft("");
    setActive(0);
    if (selected.includes(v)) return;
    onChange([...selected, v]);
  }

  // Enter/comma: take the highlighted option, else (free mode) the typed value.
  function commitDraft() {
    if (matches.length > 0) {
      addValue(matches[Math.min(active, matches.length - 1)].value);
      return;
    }
    const t = draft.trim();
    if (!strict && t !== "") addValue(t);
  }

  function removeAt(i: number) {
    const next = selected.filter((_, j) => j !== i);
    onChange(next.length > 0 ? next : undefined);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex min-h-8 w-56 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 shadow-sm">
        {selected.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
          >
            {labelOf(v)}
            <button
              type="button"
              aria-label={messages.removeValue}
              onClick={() => removeAt(i)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={draft}
          placeholder={messages.value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && draft === "" && selected.length > 0) {
              removeAt(selected.length - 1);
            }
          }}
          className="h-6 min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label={messages.value}
        />
        <ChevronsUpDown
          className="size-4 shrink-0 cursor-pointer text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        />
      </div>
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-56 overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {matches.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => addValue(o.value)}
                className={cn(
                  "w-full rounded-sm px-2 py-1 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                )}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  // remounts this input when the value shape changes, via its arity-based key).
  // They cannot be derived
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

  // Both ends share the column's scalar input; temporal ends carry the step.
  function field(v: unknown, on: (x: unknown) => void) {
    switch (column.type) {
      case "datetime":
        return <DatetimeValueInput value={v} onChange={on} step={column.step} />;
      case "time":
        return <TimeValueInput value={v} onChange={on} step={column.step} />;
      case "date":
        return <DateValueInput value={v} onChange={on} />;
      case "decimal":
        return <DecimalValueInput value={v} onChange={on} />;
      default:
        return <NumberValueInput value={v} onChange={on} />;
    }
  }

  return (
    <div className="flex items-center gap-1">
      {field(a, handleA)}
      <span className="text-xs text-muted-foreground">–</span>
      {field(b, handleB)}
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
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
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
