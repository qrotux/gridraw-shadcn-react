import * as React from "react";

import type { ScalarInputKind } from "../core/value-input-spec";
import { ScalarValueInput } from "./scalar";

export function BetweenValueInput({
  field,
  value,
  onChange,
  step,
}: {
  field: ScalarInputKind;
  value: unknown;
  onChange: (v: unknown) => void;
  step?: number;
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

  return (
    <div className="flex items-center gap-1">
      <ScalarValueInput field={field} value={a} onChange={handleA} step={step} />
      <span className="text-xs text-muted-foreground">–</span>
      <ScalarValueInput field={field} value={b} onChange={handleB} step={step} />
    </div>
  );
}
