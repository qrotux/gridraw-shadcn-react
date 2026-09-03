/**
 * The root entry's useGridUrlState takes the search params and a setter, so
 * any router can drive it. Here the History API plays that role; a TanStack
 * Router or Next.js binding has the same shape.
 */
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GridPage, useGridUrlState } from "@qrotux/gridraw-shadcn-react";

const queryClient = new QueryClient();

/**
 * Search params backed by window.location, kept in sync with the Back button.
 * Updates replace the history entry: every keystroke in the search box would
 * otherwise become a step the user has to click through.
 */
function useHistorySearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const [search, setSearch] = React.useState(() => window.location.search);

  React.useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // A new URLSearchParams on every render would give useGridUrlState a fresh
  // object each time and re-run everything memoised on it.
  const params = React.useMemo(() => new URLSearchParams(search), [search]);

  const setParams = React.useCallback((next: URLSearchParams) => {
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    // replaceState fires no event, so the state has to be pushed by hand.
    setSearch(query ? `?${query}` : "");
  }, []);

  return [params, setParams];
}

function UsersGrid() {
  const [params, setParams] = useHistorySearchParams();
  const [state, setState] = useGridUrlState(params, setParams);
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
 * Nothing forces the state into the URL. Component state works too, at the
 * cost of losing shareable links and Back-button navigation.
 */
export function EphemeralGrid() {
  const [params, setParams] = React.useState(() => new URLSearchParams());
  const [state, setState] = useGridUrlState(params, setParams);
  return <GridPage name="users" state={state} onStateChange={setState} />;
}
