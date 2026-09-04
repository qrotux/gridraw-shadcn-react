import * as React from "react";
import { X } from "lucide-react";

import { coerceElement } from "../core/coerce";
import type { ColType } from "../core/types";
import { cn } from "../ui/cn";
import { useGridI18n } from "../messages";
import { useGridUi } from "../slots";

// Free multi-value entry for columns with no enum list (a uuid `in`, and
// non-enum array columns). A token is added with Enter or comma; Backspace on
// an empty field removes the last. A half-typed token that was never added is
// dropped, exactly as an unchecked box would be — commit only sees added ones.
export function TagValueInput({
  element,
  value,
  onChange,
}: {
  element: ColType; // element type a typed token is coerced to
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Badge, Input } = components;
  const tags = Array.isArray(value) ? (value as unknown[]) : [];
  const [draft, setDraft] = React.useState("");

  function add() {
    const raw = draft.trim();
    setDraft("");
    if (!raw) return;
    const v = coerceElement(element, raw);
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
        <Badge key={i} variant="secondary" className={cn("border-border", classNames.chip)}>
          {String(t)}
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
        className={cn("h-8 w-40", classNames.valueInput)}
      />
    </div>
  );
}
