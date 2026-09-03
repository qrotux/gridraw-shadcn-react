import type { FilterClause, GridState, SortDir, SortSpec } from "./types";

export function parseFilters(raw: string | null): FilterClause[][] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as FilterClause[][]) : [];
  } catch {
    return [];
  }
}

/** Parses `col:dir,col:dir`; invalid directions and repeated columns are dropped (first wins). */
export function parseSort(raw: string | null): SortSpec[] {
  if (!raw) return [];
  const out: SortSpec[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const [column, dir] = part.split(":");
    if (!column || (dir !== "asc" && dir !== "desc") || seen.has(column)) continue;
    seen.add(column);
    out.push({ column, dir: dir as SortDir });
  }
  return out;
}

export function parsePageSize(raw: string | null): number | undefined {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Reads GridState from the URL params `f`, `sort`, `page`, `q`, `ps`. */
export function parseGridState(params: URLSearchParams): GridState {
  return {
    filters: parseFilters(params.get("f")),
    sort: parseSort(params.get("sort")),
    page: Math.max(1, Number(params.get("page")) || 1),
    q: params.get("q") ?? "",
    pageSize: parsePageSize(params.get("ps")),
  };
}

/** Writes GridState to URL params; default values are omitted so the URL stays short. */
export function serializeGridState(state: GridState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.filters.length) p.set("f", JSON.stringify(state.filters));
  if (state.sort.length) p.set("sort", state.sort.map((s) => `${s.column}:${s.dir}`).join(","));
  if (state.page > 1) p.set("page", String(state.page));
  if (state.q) p.set("q", state.q);
  if (state.pageSize) p.set("ps", String(state.pageSize));
  return p;
}

/** Merges a patch into the state. Changing filters, search or page size resets
 *  the page to 1 unless the patch sets the page explicitly. */
export function applyGridStatePatch(state: GridState, patch: Partial<GridState>): GridState {
  const next = { ...state, ...patch };
  if (("filters" in patch || "q" in patch || "pageSize" in patch) && !("page" in patch)) next.page = 1;
  return next;
}
