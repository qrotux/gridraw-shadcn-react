import * as React from "react";

import type { CellOverride } from "./core/types";

export type ClampedTextCellOptions = {
  /** Collapse threshold in characters. */
  clamp: number;
  /** aria-label texts for the expanded / collapsed state. */
  labels: { expand: string; collapse: string };
  /** Line-wrap class in the expanded state. Long single-token strings (user
   *  agents, hashes) need `break-all`, otherwise they stretch the table;
   *  ordinary text needs `break-words` so words are not cut mid-way. */
  wrap: "break-all" | "break-words";
};

/**
 * Builds a cellOverride for a long-text column collapsed to `clamp` characters
 * with an ellipsis and expanded on click.
 *
 * The expanded flag lives here, at page level, not inside the cell renderer:
 * the grid calls the override once per row, and a useState inside it would
 * give each cell its own state, so one click would expand a single row.
 * One click expands the whole column so values can be compared row by row.
 */
export function useClampedTextCell({ clamp, labels, wrap }: ClampedTextCellOptions): CellOverride {
  const [expanded, setExpanded] = React.useState(false);
  return React.useCallback(
    ({ value }, Default) => {
      // null/empty go to the default renderer, which owns the empty glyph.
      if (value === null || value === undefined || value === "") return <Default />;
      const full = String(value);
      const clamped = full.length > clamp;
      return (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={full}
          aria-expanded={expanded}
          aria-label={expanded ? labels.collapse : labels.expand}
          className={`cursor-pointer text-left underline-offset-2 hover:underline ${
            expanded ? `whitespace-normal ${wrap}` : "block truncate"
          }`}
        >
          {expanded || !clamped ? full : `${full.slice(0, clamp)}…`}
        </button>
      );
    },
    [clamp, labels.collapse, labels.expand, wrap, expanded],
  );
}
