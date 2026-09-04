import * as React from "react";

import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

export function NumberValueInput({
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
