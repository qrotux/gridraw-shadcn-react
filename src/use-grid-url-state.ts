import * as React from "react";

import type { GridState } from "./core/types";
import { applyGridStatePatch, parseGridState, serializeGridState } from "./core/url-codec";

/** Router-agnostic URL state. The caller supplies the current search params
 *  and a setter; `./react-router` wires this to react-router's useSearchParams. */
export function useGridUrlState(
  params: URLSearchParams,
  setParams: (next: URLSearchParams) => void,
): [GridState, (patch: Partial<GridState>) => void] {
  const state = React.useMemo(() => parseGridState(params), [params]);

  const setState = React.useCallback(
    (patch: Partial<GridState>) => {
      setParams(serializeGridState(applyGridStatePatch(state, patch)));
    },
    [state, setParams],
  );

  return [state, setState];
}
