import * as React from "react";
import { useSearchParams } from "react-router-dom";

import type { GridState } from "./core/types";
import { useGridUrlState as useGridUrlStateWith } from "./use-grid-url-state";

/** Grid URL state bound to react-router. Updates replace the history entry. */
export function useGridUrlState(): [GridState, (patch: Partial<GridState>) => void] {
  const [params, setParams] = useSearchParams();
  const replace = React.useCallback(
    (next: URLSearchParams) => setParams(next, { replace: true }),
    [setParams],
  );
  return useGridUrlStateWith(params, replace);
}
