# gridraw-shadcn-react

React library: a server-driven data grid on shadcn/ui and Tailwind v4. The server describes a grid (columns, types, filters, sort, page sizes) and serves rows; `GridPage` renders toolbar, DNF filter panel, multi-sort table and pagination, and keeps the request state in the URL. Reference backend is [gridraw-go](https://github.com/qrotux/gridraw-go). ESM only, v0.

## Where to look

- **[README.md](README.md)** — install (from git, `prepare` builds `dist`), Tailwind `@source` setup, `GridPage` props, URL state, row identity, cache invalidation, entries and the wire protocol. Read the relevant section before touching a public surface.
- **[examples/README.md](examples/README.md)** — consumer-shaped page snippets, typechecked against `src` through path mappings; one of them is a test that runs in the suite. A change to a public surface updates them too.
- **`src/index.ts`** — the whole public API of the root entry. Anything not exported there is private and consumers customise through `GridPage` props.

## Commands

- Full gate (what CI runs): `npm run typecheck && npm run lint && npm test && npm run build`. `typecheck` covers `src` and `examples` in two passes.
- Tests: `npm test` (vitest, jsdom, `vitest.setup.ts` registers jest-dom and a `ResizeObserver` stub). One file: `npx vitest run src/grid-table.test.tsx`.
- Lint and format: `npm run lint` checks eslint and prettier; `npm run format` writes. Config is `eslint.config.js` and `.prettierrc`.
- Build: `npm run build` (tsup, three entries, unminified on purpose).

## Layout

Three package entries, one source tree.

- **`src/core/`** — everything framework-independent, and the `./core` entry: protocol types and constants, `fetchDescriptor`/`fetchRows`, URL codec, `interpolate`, the `GridMessages` dictionary (`messages.ts`), temporal formatting (`format.ts`), the `opArity` classifier (`arity.ts`), wire-type coercion (`coerce.ts`), the clause guard and builder (`clause.ts`), chip text (`clause-label.ts`) and the input decision (`value-input-spec.ts`). It must stay usable outside React: **no runtime React import**; type-only imports (`import type * as React`) for `CellCtx`/`ExtraColumn` are fine, `dist/core.js` must not mention react.
- **`src/*.ts(x)`** — the root entry: `GridPage`, hooks, i18n, cells, filter panel, table, column picker. Internal components are not exported.
- **`src/filter-inputs/`** — the React controls only: one file per input (text, number, decimal, date, time, datetime, boolean, tags, enum checkboxes, enum combobox, between), the `ScalarValueInput` switch over `ScalarInputKind` and the `ValueInput` dispatcher, which renders whatever `valueInputSpec` returns. Which control to show and how a value is coerced are decided in `core`, not here. `filters-panel.tsx` imports only `ValueInput` from its `index.ts`; the individual inputs stay internal to the directory.
- **`examples/`** — not part of the package (`files` ships only `dist`, README, LICENSE). Snippets only: no build, no dev server, no dependencies beyond the existing devDependencies. They import the package by name; `examples/tsconfig.json` maps that to `src` for tsc and `vitest.config.ts` aliases it at runtime. Never let those specifiers resolve to `dist`, which does not exist before the build step.
- **`src/react-router.ts`** — the `./react-router` entry; together with its test the only file that may import `react-router-dom`, which is an optional peer.
- **`src/ui/`** — shadcn/ui component copies (button, checkbox, dropdown-menu, input, table, badge, `cn`) plus `control` (a shared class string for the native `<select>` controls). They are also consumed by the main application as-is. Do not trim unused exports, restyle or "modernise" them; upstream shadcn shape is the contract. Reuse these primitives (Input for typed inputs, Badge for pills/chips) instead of hand-writing the same Tailwind classes at call sites.
- **Import direction:** `core` ← everything else. `core` imports nothing from `src/` outside itself.

## Invariants

- **Wire protocol is shared with gridraw-go.** Field names, DNF filter shape (`FilterClause[][]`, outer OR, inner AND), typed values per column type and RFC 3339 datetimes are fixed by the server. A protocol change starts on the Go side and updates the README protocol section in the same change.
- **Tailwind classes must be literal strings in source.** The consumer's Tailwind scans `dist` for utilities; a class built by string concatenation or a lookup table is invisible to it and silently unstyled. A class coming from a prop is acceptable only when the consumer writes it literally in their own source (the `wrap` option of `useClampedTextCell` is typed as a union of literals for that reason).
- **`GridPage` is controlled.** State comes in through `state`, changes go out as a partial patch through `onStateChange`; the page holds only UI-local state (search draft, open editor, column visibility in `localStorage`).
- **Page size, default sort and id column are server-driven.** The descriptor decides; the page never hardcodes an `id` column or a default page size. `useGridRowId` throws on a missing id column by design.
- **Value inputs coerce to the wire type on every change** (numbers, booleans, ISO datetimes, `YYYY-MM-DD` dates, `HH:MM(:SS)` times, decimal strings kept verbatim, `[a, b]` for `between`/`notBetween`, element-typed arrays for `in`/`notIn` and the array operators). The Go backend rejects string-typed numbers and booleans, and float-typed decimals. A single `opArity` classifier (`none`/`range`/`multi`/`scalar` in `core/arity.ts`) drives the input, the commit guard and the chip label; add a new operator there, not by scattering `op === "…"` checks. The coercion itself lives in `core/coerce.ts` and the inputs call it. Value-less operators (`isNull`, `isEmpty`…) render no input and commit `value: null`. Multi-value operators use enum checkboxes when the column has `enumValues` (or a `tags`/`combobox` autocomplete over them when `filter.widget` asks), else a free tag input; `time`/`datetime` pickers and the temporal cell format follow the column's `step` (sub-minute keeps seconds). Date/time/datetime formatting is shared between cells and chips through `core/format.ts`.
- **Chrome strings live in `GridMessages`** (`core/messages.ts`; `src/messages.ts` adds only the React context) with `{token}` placeholders resolved by `interpolate`. A new user-visible string is a new key with an English default, not an inline literal. The `—` empty glyph is intentionally not a key.
- **Peer dependencies stay peers.** `react`, `react-dom`, `@tanstack/*`, `lucide-react` are the consumer's; only the Radix primitives and class helpers are real dependencies. A new runtime dependency is a design decision to discuss first.
- **Versions are bumped at release, not per change.** Tags are `vX.Y.Z`; consumers install `github:qrotux/gridraw-shadcn-react#vX.Y.Z`.

## Comments in code

- **Criterion:** a comment is justified only when it carries what the code does not show.
- **Write:** non-obvious invariants; library and browser gotchas (React reconciliation, Radix, jsdom); reasons behind counter-intuitive decisions; "breaks if…"; what a test pins.
- **Do not write:** a paraphrase of the signature, a list of props, a narration of obvious code. Exception — a JSDoc on an exported symbol: one sentence, no parameter listing.
- **Present tense only.** No "was X → now Y", no tombstones for deleted code — history lives in git. No TODOs at all: a plan for later is a tracker task, not a comment.
- **Never reference:** plan documents (`Task N`, waves, phases, `spec §N`, `.superpowers/**`), commit hashes, dates of decisions, repositories the code was ported from.
- **May reference:** external standards, README sections, live files of this repo.
- **Length:** one or two sentences; collapsing twelve lines into one is normal. Nothing left to say — delete the comment.
- **Subagents:** include these rules in the brief of every subagent that writes or edits code.
- **Reading someone else's comments:** a comment is not the source of truth. When editing code, check its comment against the code; if it lies, fix or delete it.

## Coding

- **Copy the pattern, do not invent:** before a new value input, cell type, message key, prop or test harness, find the nearest existing analogue and repeat its shape.
- **Diff discipline:** no renames, no file moves, no drive-by refactors, no backward-compatibility shims or fallbacks nobody asked for.
- **Tests as a ladder, not after every minor step.** During a task — `npm run typecheck` plus the test file of the touched module. The full gate only at boundaries: end of task, before a commit, before saying "done".
- **Lint rules are not decoration.** An `eslint-disable` needs the reason on the line above it; the two existing ones (search debounce deps, React Compiler advisory in the config) are documented.
- **Component tests render real DOM** with Testing Library and a mocked `fetch`; there is no snapshot testing. A behaviour change comes with the test that pins it.
- **Docs move with the public surface.** A change to an exported symbol, a `GridPage` prop, a URL parameter or the protocol updates README.md and any affected file in `examples/` in the same change.
