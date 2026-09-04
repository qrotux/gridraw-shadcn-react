import type * as React from "react";
import { Check, X } from "lucide-react";

import type { GridColumn } from "./core/types";
import { formatTemporal } from "./format";
import { useGridI18n } from "./messages";

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}

/** Default cell renderer by the descriptor's ColType. */
export function CellValue({ column, value }: { column: GridColumn; value: unknown }) {
  const { locale } = useGridI18n();
  if (value === null || value === undefined) return <Empty />;
  // An array column renders each element as its own element-typed cell (enum
  // elements become badges, datetimes are localized, and so on). An empty
  // array reads as no data.
  if (column.array && Array.isArray(value)) {
    if (value.length === 0) return <Empty />;
    const elementColumn: GridColumn = { ...column, array: false };
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {value.map((el, i) => (
          <CellValue key={i} column={elementColumn} value={el} />
        ))}
      </span>
    );
  }
  switch (column.type) {
    case "boolean":
      return value ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <X className="size-4 text-muted-foreground" />
      );
    case "datetime":
    case "date":
    case "time":
      return <span className="tabular-nums">{formatTemporal(column.type, value, locale, column.step)}</span>;
    case "number":
      return <span className="block text-right tabular-nums">{String(value)}</span>;
    case "decimal":
      // Already a string with its stored scale ("4.10"); shown as-is, not parsed.
      return <span className="block text-right tabular-nums">{String(value)}</span>;
    case "uuid":
      return <span className="font-mono text-xs">{String(value)}</span>;
    case "enum": {
      const label = column.filter?.enumValues?.find((e) => e.value === value)?.label ?? String(value);
      return <Badge>{label}</Badge>;
    }
    case "json": {
      // jsonb arrives already parsed, so String(value) would give
      // "[object Object]". Compact JSON in the cell, full text in the title.
      const text = JSON.stringify(value);
      return (
        <span className="truncate font-mono text-xs" title={text}>
          {text}
        </span>
      );
    }
    default:
      return <span className="truncate">{String(value)}</span>;
  }
}
