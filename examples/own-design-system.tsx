// Rendering the grid with your own shadcn components and your own spacing.
//
// The package ships its own shadcn copies and uses them by default; anything
// passed through `components` replaces one slot. Slots you leave out keep the
// built-in component, so adopting this is incremental.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  GridPage,
  type GridClassNames,
  type GridComponents,
  type GridSelectProps,
} from "@qrotux/gridraw-shadcn-react";
import { useGridUrlState } from "@qrotux/gridraw-shadcn-react/react-router";

// Stand-ins for your own "@/components/ui/*". A component from a shadcn project
// satisfies the slot types structurally, so normally you just import and pass
// it — no wrapper of any kind.
function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={`h-10 rounded-xl border px-3 ${props.className ?? ""}`} />;
}

function Button({
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & { variant?: string; size?: string }) {
  return <button {...props} data-variant={variant} data-size={size} className="h-10 rounded-xl px-4" />;
}

// `Select` is the one slot with a shape of its own: shadcn's Select is a
// five-part Radix composite, so the grid asks for a flat contract and you adapt
// yours to it. Here a native select stands in for that adapter.
function Select({ value, onValueChange, options, placeholder, ariaLabel, className }: GridSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label={ariaLabel}
      className={className}
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

const components: Partial<GridComponents> = { Input, Button, Select };

// Class strings for the containers no slot covers. They merge through
// tailwind-merge, so `h-10` here displaces the built-in `h-8` instead of
// fighting it. Write them literally, as below, or your Tailwind will not
// generate them.
const classNames: GridClassNames = {
  toolbar: "gap-3",
  valueInput: "h-10 w-48",
  tableWrapper: "rounded-xl shadow-sm",
  headerCell: "uppercase tracking-wide",
};

const qc = new QueryClient();

export function UsersPage() {
  const [state, setState] = useGridUrlState();
  return (
    <QueryClientProvider client={qc}>
      <GridPage
        name="users"
        state={state}
        onStateChange={setState}
        components={components}
        classNames={classNames}
      />
    </QueryClientProvider>
  );
}
