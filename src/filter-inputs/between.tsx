import * as React from "react";

import type { GridColumn } from "../core/types";
import { DateValueInput } from "./date";
import { DatetimeValueInput } from "./datetime";
import { DecimalValueInput } from "./decimal";
import { NumberValueInput } from "./number";
import { TimeValueInput } from "./time";

export function BetweenValueInput({
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
  // They cannot be derived from the `value` prop: while only one side is
  // filled, onChange emits `undefined` every keystroke, React bails out of the
  // parent's identical setState, and no re-render brings the other side back.
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
