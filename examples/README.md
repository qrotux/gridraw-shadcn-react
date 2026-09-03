# Examples

Source snippets, not a runnable application. Each file is a complete page you
can paste into your own app and adjust. They import the package by name, so
what you read is what a consumer writes; `tsconfig.json` here maps those
specifiers to `../src` so `npm run typecheck` fails whenever a change breaks
them, and `vitest.config.ts` aliases them the same way for the example test.

They assume a server that speaks the wire protocol from the root
[README](../README.md), such as [gridraw-go](https://github.com/qrotux/gridraw-go).

| File                                                           | Shows                                                                                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [basic-react-router.tsx](basic-react-router.tsx)               | The minimal page: a query client, `useGridUrlState` from `./react-router`, `GridPage`. Plus a grid served from a non-default `basePath`.                                                            |
| [custom-cells-and-actions.tsx](custom-cells-and-actions.tsx)   | `cellOverrides` wrapping the built-in cell, an actions column via `extraColumns` and `useGridRowId`, `extraFetch`, `useClampedTextCell`, `invalidateGridRows` after a mutation, Russian `messages`. |
| [url-state-without-router.tsx](url-state-without-router.tsx)   | Driving the router-agnostic `useGridUrlState` from the History API, and the same hook with the state held in memory.                                                                                |
| [testing-custom-cells.test.tsx](testing-custom-cells.test.tsx) | Testing an actions cell without mounting `GridPage`: `GridIdColumnProvider` supplies the id column `useGridRowId` reads. Runs as part of `npm test`.                                                |

## Checking them

From the repository root:

```sh
npm run typecheck   # includes examples/
npm run lint
npm test            # runs testing-custom-cells.test.tsx too
```
