# PROTOTYPE — throwaway. Do not build on this.

Four renderings of the **decoder-specific** block (`definitions`, `check`,
`parse|<field>`, `normalize`), switchable via `?variant=` on the existing decoder
form route. Everything else on the form — `name`, `enabled` and the whole
`metadata` block — is byte-identical across all four, because those are already
consistent with the filter, KVDB and integration forms and are not in question.

Open the decoder form and append `&variant=<key>` (or use the floating bar at the
bottom of the screen; arrow keys work too):

| key        | name                | the idea |
| ---------- | ------------------- | -------- |
| `baseline` | Current             | What is on `5.0.0` today. The thing being judged against. |
| `steps`    | Pipeline steps      | `normalize` as `EuiSteps` — the sequence *is* the layout, so numbering and order stop needing their own furniture. |
| `tabs`     | Grammar tabs        | `EuiTabbedContent` splits Check / Parsers / Normalize, so only one concern is on screen at a time and the page stops being a tall stack. |
| `table`    | Summary + flyout    | `normalize` collapses to an `EuiBasicTable` of one-line summaries; editing opens an `EuiFlyout`. The form itself stays short. |

Only components already used elsewhere in this plugin are used here
(`EuiSteps` ×3, `EuiTabbedContent` ×4, `EuiBasicTable` ×11, `EuiFlyout` ×18,
`EuiBadge` ×19). `EuiListGroup` and `EuiSplitPanel` are deliberately avoided —
nothing in the plugin uses them.

The switcher renders only outside production builds.

## When a winner is picked

Fold it into `DecoderEditorForm.tsx` properly (this code has no tests and no error
handling), then delete this directory and the `variant` plumbing from
`DecoderFormPage.tsx` and `DecoderEditorForm.tsx`. The full set lives on the
throwaway branch, not on the version branch.
