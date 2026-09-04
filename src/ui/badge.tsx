import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

// Two shapes cover every pill in the grid: `outline` for a plain labelled badge
// (enum cells), `chip` for a removable filter chip. Colors stay on theme tokens.
const badgeVariants = cva("inline-flex items-center gap-1 border px-2 py-0.5 text-xs", {
  variants: {
    variant: {
      outline: "rounded-md font-medium",
      chip: "rounded-full bg-muted",
    },
  },
  defaultVariants: { variant: "outline" },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
