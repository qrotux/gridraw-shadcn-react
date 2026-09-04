import * as React from "react";
import { Columns, Info } from "lucide-react";

import type { GridColumn, GridDescriptor } from "./core/types";
import { DescriptionTip } from "./description-tip";
import { useGridI18n } from "./messages";
import { useGridUi } from "./slots";

function storageKey(name: string) {
  return `grid:${name}:columns`;
}

function readStored(name: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(name));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : null;
  } catch {
    return null;
  }
}

function writeStored(name: string, keys: string[]) {
  try {
    window.localStorage.setItem(storageKey(name), JSON.stringify(keys));
  } catch {
    // localStorage unavailable (private mode / quota): state stays in memory only.
  }
}

function defaultVisible(descriptor: GridDescriptor): string[] {
  return descriptor.columns.filter((c) => c.defaultVisible).map((c) => c.key);
}

const NOOP: (keys: string[]) => void = () => {};

/**
 * Visible column keys: localStorage or defaultVisible, persisted on change.
 * `descriptor` is optional because GridPage calls this before its isPending
 * early return; without a descriptor it returns [] and a no-op setter.
 */
export function useVisibleColumns(
  name: string,
  descriptor?: GridDescriptor,
): [string[], (keys: string[]) => void] {
  // The user's explicit choice in this session (null = untouched).
  const [override, setOverride] = React.useState<string[] | null>(null);
  const stored = React.useMemo(() => readStored(name), [name]);

  const update = React.useCallback(
    (keys: string[]) => {
      setOverride(keys);
      writeStored(name, keys);
    },
    [name],
  );

  // Visibility is derived synchronously on the render where the descriptor
  // appears (override → localStorage → defaultVisible), without useEffect, so
  // there is no intermediate render with visible=[] and the rows request goes
  // out once.
  if (!descriptor) return [[], NOOP];
  return [override ?? stored ?? defaultVisible(descriptor), update];
}

export function ColumnPicker({
  columns,
  visible,
  onChange,
}: {
  columns: GridColumn[];
  visible: string[];
  onChange: (keys: string[]) => void;
}) {
  const { messages } = useGridI18n();
  const {
    Button,
    Checkbox,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } = useGridUi().components;
  const visibleSet = React.useMemo(() => new Set(visible), [visible]);

  function toggle(key: string, checked: boolean) {
    onChange(checked ? [...visible, key] : visible.filter((k) => k !== key));
  }

  function reset() {
    onChange(columns.filter((c) => c.defaultVisible).map((c) => c.key));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="mr-2 size-4" />
          {messages.columns}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{messages.visibleColumns}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuItem key={col.key} className="gap-2" onSelect={(e) => e.preventDefault()}>
            <Checkbox
              checked={visibleSet.has(col.key)}
              onCheckedChange={(checked) => toggle(col.key, checked === true)}
            />
            <span>{col.title}</span>
            {col.description && (
              <DescriptionTip description={col.description}>
                {/* A span, not the icon itself: Radix's trigger needs a host
                    element it can attach handlers and a ref to, and it must
                    stay focusable so the description is reachable by keyboard
                    inside the menu. */}
                <span tabIndex={0} aria-label={col.description} className="ml-auto text-muted-foreground">
                  <Info className="size-3.5" />
                </span>
              </DescriptionTip>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          {messages.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
