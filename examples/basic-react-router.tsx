/**
 * The smallest working page: react-router keeps the grid state in the URL,
 * react-query caches descriptor and rows, GridPage renders everything else.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GridPage } from "@qrotux/gridraw-shadcn-react";
import { useGridUrlState } from "@qrotux/gridraw-shadcn-react/react-router";

// One client per application, created outside the component so a re-render
// does not throw the cache away.
const queryClient = new QueryClient();

/** Renders the grid the server publishes as "users". */
function UsersGrid() {
  const [state, setState] = useGridUrlState();
  return <GridPage name="users" state={state} onStateChange={setState} />;
}

export function UsersPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <UsersGrid />
    </QueryClientProvider>
  );
}

/**
 * A grid served from somewhere other than the default `/api/admin/grids`.
 * The endpoints become GET `/admin/api/grids/orders` and POST
 * `/admin/api/grids/orders/rows`.
 */
export function OrdersGrid() {
  const [state, setState] = useGridUrlState();
  return (
    <GridPage
      name="orders"
      basePath="/admin/api/grids"
      state={state}
      onStateChange={setState}
      locale="ru-RU"
    />
  );
}
