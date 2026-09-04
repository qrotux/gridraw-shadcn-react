import * as React from "react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/cn";
import { controlClass } from "./ui/control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export type SelectOption = { value: string; label: string };

/** The grid's own flat select contract; shadcn's Select is a five-part Radix
 *  composite, so a consumer who wants theirs writes a small adapter. */
export type GridSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Label of a leading empty-value option; no such option when unset. */
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

// Every slot is typed by the props the grid actually passes, never by the full
// upstream type: a component matching this shape structurally drops in with no
// adapter, and no @radix-ui/* type reaches the public API.
export type GridComponents = {
  Input: React.ComponentType<React.ComponentProps<"input">>;
  Button: React.ComponentType<
    React.ComponentProps<"button"> & { variant?: "outline" | "ghost"; size?: "sm" }
  >;
  Checkbox: React.ComponentType<{
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
    className?: string;
  }>;
  Badge: React.ComponentType<{
    variant?: "secondary" | "outline";
    className?: string;
    children?: React.ReactNode;
  }>;
  Select: React.ComponentType<GridSelectProps>;
  Table: React.ComponentType<React.ComponentProps<"table">>;
  TableHeader: React.ComponentType<React.ComponentProps<"thead">>;
  TableBody: React.ComponentType<React.ComponentProps<"tbody">>;
  TableRow: React.ComponentType<React.ComponentProps<"tr">>;
  TableHead: React.ComponentType<React.ComponentProps<"th">>;
  TableCell: React.ComponentType<React.ComponentProps<"td">>;
  DropdownMenu: React.ComponentType<{ children?: React.ReactNode }>;
  DropdownMenuTrigger: React.ComponentType<{ asChild?: boolean; children?: React.ReactNode }>;
  DropdownMenuContent: React.ComponentType<{
    align?: "start" | "center" | "end";
    children?: React.ReactNode;
  }>;
  DropdownMenuItem: React.ComponentType<{
    className?: string;
    onSelect?: (event: Event) => void;
    children?: React.ReactNode;
  }>;
  DropdownMenuLabel: React.ComponentType<{ children?: React.ReactNode }>;
  DropdownMenuSeparator: React.ComponentType<{ className?: string }>;
};

/** Class strings appended to the grid's own containers. Each is merged through
 *  `cn`, so a consumer's `h-10` displaces the built-in `h-8` instead of
 *  colliding with it. */
export type GridClassNames = {
  toolbar?: string;
  search?: string;
  filterPanel?: string;
  filterGroup?: string;
  filterEditor?: string;
  chip?: string;
  valueInput?: string;
  tableWrapper?: string;
  row?: string;
  headerCell?: string;
  cell?: string;
  pagination?: string;
};

function NativeSelect({ value, onValueChange, options, placeholder, ariaLabel, className }: GridSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(controlClass, className)}
      aria-label={ariaLabel}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const defaultGridComponents: GridComponents = {
  Input,
  Button,
  Checkbox,
  Badge,
  Select: NativeSelect,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};

export function mergeComponents(partial?: Partial<GridComponents>): GridComponents {
  return partial ? { ...defaultGridComponents, ...partial } : defaultGridComponents;
}

export type GridUi = { components: GridComponents; classNames: GridClassNames };

const GridUiContext = React.createContext<GridUi>({
  components: defaultGridComponents,
  classNames: {},
});

export function GridUiProvider({ value, children }: { value: GridUi; children: React.ReactNode }) {
  return React.createElement(GridUiContext.Provider, { value }, children);
}

export function useGridUi(): GridUi {
  return React.useContext(GridUiContext);
}
