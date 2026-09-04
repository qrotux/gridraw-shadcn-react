import * as React from "react";
import { ChevronsUpDown, X } from "lucide-react";

import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";
import type { EnumValue } from "../core/types";

// Enum multi-value entry as a select-style combobox: selected values show as
// chips, and typing filters a dropdown of the enum values that the user picks
// from (mouse or keyboard). `strict` keeps only values from `options`; free
// mode also accepts a typed value that matches none, so the options act as
// suggestions. The dropdown is a plain inline panel, not a popover overlay.
export function EnumTagInput({
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
  const { components, classNames } = useGridUi();
  const { Badge } = components;
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
      {/* The real focus target is the inner input, so the ring lives on the
          wrapper via focus-within; the classes are Input's, with focus-visible
          swapped for focus-within. */}
      <div
        className={cn(
          "flex min-h-8 w-56 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-0.5 shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
          classNames.valueInput,
        )}
      >
        {selected.map((v, i) => (
          <Badge key={i} variant="secondary" className={cn("border-border", classNames.chip)}>
            {labelOf(v)}
            <button
              type="button"
              aria-label={messages.removeValue}
              onClick={() => removeAt(i)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3" />
            </button>
          </Badge>
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
