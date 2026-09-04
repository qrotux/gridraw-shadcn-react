import * as React from "react";

import { useGridUi } from "./slots";

// A column description is extra prose, never the only way to understand the
// grid, so the tip opens late on purpose: a pointer crossing the header on its
// way somewhere else must not set off a popup behind it.
const DESCRIPTION_DELAY_MS = 2000;

/** Wraps `children` in the column's description tooltip. Radix opens it on
 *  hover and on keyboard focus, so the description is reachable without a
 *  mouse. */
export function DescriptionTip({
  description,
  children,
}: {
  description: string;
  children: React.ReactNode;
}) {
  const { Tooltip, TooltipTrigger, TooltipContent } = useGridUi().components;
  return (
    <Tooltip delayDuration={DESCRIPTION_DELAY_MS}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{description}</TooltipContent>
    </Tooltip>
  );
}
