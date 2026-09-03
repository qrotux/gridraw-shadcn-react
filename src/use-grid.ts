import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query";

import { fetchDescriptor, fetchRows } from "./core/fetch";
import { DEFAULT_GRID_BASE, type RowsRequest } from "./core/types";

export function useGridDescriptor(name: string, basePath = DEFAULT_GRID_BASE) {
  return useQuery({
    queryKey: ["grid", name, "descriptor"],
    queryFn: () => fetchDescriptor(name, basePath),
    staleTime: Infinity,
  });
}

export function useGridRows(name: string, req: RowsRequest | null, basePath = DEFAULT_GRID_BASE) {
  return useQuery({
    queryKey: ["grid", name, "rows", req],
    enabled: req !== null,
    queryFn: () => fetchRows(name, req as RowsRequest, basePath),
    placeholderData: keepPreviousData,
  });
}

/** Refetches every rows page of the named grid; call after a mutation. */
export function invalidateGridRows(qc: QueryClient, name: string) {
  return qc.invalidateQueries({ queryKey: ["grid", name, "rows"] });
}
