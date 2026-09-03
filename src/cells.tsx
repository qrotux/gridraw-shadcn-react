import type * as React from "react";
import { Check, X } from "lucide-react";

import type { GridColumn } from "./core/types";
import { useGridI18n } from "./messages";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(locale: string): Intl.DateTimeFormat {
  let f = fmtCache.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TZ, // explicit zone avoids the ENVIRONMENT_FALLBACK path
    });
    fmtCache.set(locale, f);
  }
  return f;
}

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
  switch (column.type) {
    case "boolean":
      return value ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <X className="size-4 text-muted-foreground" />
      );
    case "datetime":
      return <span className="tabular-nums">{dateFormatter(locale).format(new Date(String(value)))}</span>;
    case "number":
      return <span className="block text-right tabular-nums">{String(value)}</span>;
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
