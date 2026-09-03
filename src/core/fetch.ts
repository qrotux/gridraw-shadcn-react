import { DEFAULT_GRID_BASE, type GridDescriptor, type RowsRequest, type RowsResponse } from "./types";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

/** GET `{basePath}/{name}`. */
export function fetchDescriptor(name: string, basePath = DEFAULT_GRID_BASE): Promise<GridDescriptor> {
  return fetchJSON<GridDescriptor>(`${basePath}/${name}`);
}

/** POST `{basePath}/{name}/rows`. */
export function fetchRows(
  name: string,
  req: RowsRequest,
  basePath = DEFAULT_GRID_BASE,
): Promise<RowsResponse> {
  return fetchJSON<RowsResponse>(`${basePath}/${name}/rows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
