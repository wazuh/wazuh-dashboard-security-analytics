# UX prototype — THROWAWAY

Four screens from the Security Analytics UX review, mounted on the throwaway route
`#/ux-prototype`, with three radically different variants of the R1 stage control
switchable via `?variant=A|B|C` (floating bottom bar, ← / → keys).

| Param     | Values                                    |
| --------- | ----------------------------------------- |
| `variant` | `A` ribbon band · `B` header pill · `C` left rail |
| `screen`  | `overview` (R2) · `decoders` (R6/F8.4/R9) · `logtest` (R5) · `promote` (R4) |
| `stage`   | `draft` · `test` · `custom` · `standard`  |

Real OUI 1.22.1 components throughout, including the four the review flags as
available-and-unused: `EuiPageHeader`, `EuiStepsHorizontal`, `useEuiTextDiff`,
`EuiStat`. Data is mocked (names/titles/levels copied from the live indexer) and
nothing writes — every mutation is local state.

Not production code: no tests, no error handling, no i18n. Delete or move to a
throwaway branch once a variant wins; the winner gets rewritten properly.
