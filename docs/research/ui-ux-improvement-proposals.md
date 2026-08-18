# Security Analytics Dashboards Plugin — UI/UX Improvement Research

Scope: `wazuh-dashboard-security-analytics` (Wazuh fork of `security-analytics-dashboards-plugin`). This
document grounds proposed UI/UX improvements in the plugin's actual data model, routes, and code (Part 1),
briefly surveys competitor SIEM UX patterns as inspiration (Part 2), and proposes concrete, feasible changes
(Part 3).

Architecture recap (see `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/CLAUDE.md`): this is one OSD
plugin split into `public/` (browser), `server/` (Node/Hapi routes), and `common/` (isomorphic). `public/` and
`server/` never import each other directly — they communicate over HTTP (`server/routes/*` ↔ `core.http` in
`public/`). No saved-object types are registered anywhere in the plugin (`server/plugin.ts` has no
`savedObjects.registerType` calls); all persistent state lives in OpenSearch indices behind two distinct
backend surfaces (see §1.9 below). `opensearch_dashboards.json` declares `requiredPlugins: ["data",
"navigation", "opensearchDashboardsUtils", "contentManagement"]` and `optionalPlugins: ["dataSource",
"dataSourceManagement"]` — no `visualizations`/`dashboard`/`alerting` plugin dependency, so proposals that
assume embeddable OSD visualizations or the Alerting plugin's UI are out of scope unless explicitly justified.

---

**Core entity list (re-verified for this revision).** The current product surface's core entities/resources
are exactly: **Integrations, Rules, Decoders, KVDBs, Detectors, Filters, and Findings**, plus **LogTest** as a
cross-cutting tool (not a resource with its own list/detail/CRUD lifecycle). This matches what's actually
live in `Main.tsx`'s nav + routes (see the three-tier breakdown at the end of §1.9), not merely what has a
`public/pages/<Name>` directory on disk — the tree also contains `Alerts`, `Correlations`, `Overview`,
`Dashboards`, and `LogTypes` directories, all of which are dead code today (§1.6, §1.8, §1.9). "Alerts" is
specifically **not** a current concept for this product per direct maintainer feedback — where the plugin's
data model still uses `Alert`/`AlertCondition`, that vocabulary is a holdover from the unmodified upstream
OpenSearch Security Analytics plugin, not something end users interact with in this fork; **Findings** is the
concept that carries that weight today.

## Part 1 — Primary-source investigation

### 1.1 Rules

The upstream component tree `public/pages/Rules/*` (including its `ImportRule` Sigma-file-upload flow) is
**dead code** — routing and the `DataStore` binding both point at the Wazuh-specific implementation instead:
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Main/Main.tsx:65` imports
`Rules, CreateRule, EditRule` from `'../WazuhRules'`, and
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/store/DataStore.ts:6` explicitly comments
`// Wazuh: use WazuhRulesStore instead of RulesStore`. This means there is currently **no way to import a
rule from a file** anywhere in the live UI, even though that code exists unreferenced in the tree.

Live screen: `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/WazuhRules/containers/Rules/Rules.tsx`.
It renders a space selector (line 80), a 300ms-debounced free-text search box (lines 99-105, 364-371), a
server-paginated/sortable `EuiBasicTable` with row selection (384-401), a row-actions menu (View/Edit/Delete,
216-243), and an Actions popover with **Create** and **Delete selected (N)** only (250-303), backed by
single/bulk `EuiConfirmModal`s (310-344). Edit and Delete are gated to the Draft space only
(`spaceFilter === SpaceTypes.DRAFT.value`, lines 231, 240); Create is likewise Draft-only (255-261). The
detail view is a flyout (`RuleViewerFlyout.tsx:31-85`) with no visual/YAML toggle in the flyout itself. The
editor (`public/pages/WazuhRules/components/RuleEditor/RuleEditorForm.tsx`) does offer a dual **Visual/YAML**
toggle (line ~271 YAML, ~524 Visual) plus dedicated **MITRE** and **Compliance** visual sub-editors
(`RuleEditorForm.tsx:45-47, 562, 584`, importing `MitreVisualEditor`/`ComplianceVisualEditor`).

Client → server: `public/services/RuleService.ts` — `getRules` → `POST {RULES_BASE}/_search` (26-40),
`createRule` → `POST {RULES_BASE}` (43-52), `updateRule` → `PUT {RULES_BASE}/{ruleId}` (55-64), `deleteRule`
→ `DELETE {RULES_BASE}/{ruleId}` (67-70). Route registration:
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/RuleRoutes.ts:16-74`,
`RULES_BASE = /_plugins/_security_analytics/rules`
(`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/utils/constants.ts:30`). Server service
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/services/WazuhRuleService.ts`: `getRules`
(149-209) does a raw `search` on `CONTENT_INDICES.RULES = 'wazuh-threatintel-rules'` (`server/utils/constants.ts:297`)
filtered by `space.name` (query builder `buildQuery`, lines 38-49), then enriches with integration info via a
second search on `CONTENT_INDICES.INTEGRATIONS` (`fetchIntegrationMap`, 97-147); `createRule`/`updateRule`/
`deleteRule` (211-303) go through custom transport methods `CLIENT_RULE_METHODS` (`server/utils/constants.ts:167-174`)
against the Wazuh "content manager" plugin, not a plain document write.

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Rule.ts`: `Rule` (13-35) has
`id, category, log_source, tags[{value}], false_positives[{value}], level, status, detection (YAML),
mitre (YAML), compliance (YAML), enabled: boolean`. `RuleItemInfoBase` (57-61) adds `prePackaged: boolean,
space?: string, integration?`. `RuleInfo._version` exists (line 50) — OpenSearch document versioning is
present in the model but unused in the UI.

Gaps observed: bulk actions are delete-only despite `enabled`/`tags` being first-class fields (no bulk
enable/disable); no version history/diff/rollback UI despite `_version` existing; no per-rule promote action
(promotion only exists at the parent-Integration level, `public/pages/Integrations/containers/PromoteIntegration.tsx`);
search is a single free-text box, not field-scoped like KVDBs (§1.4).

### 1.2 Decoders

`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Decoders/containers/Decoders.tsx` mirrors
the Rules layout (space selector, debounced search, sortable/paginated table with selection, Create/Delete
Actions popover, delete confirm modals) but action gating uses the generic
`actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT|DELETE)` helper (lines 201, 210) against
`AllowedActionsBySpace` (`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/common/constants.ts:80-101`)
rather than a hardcoded Draft check. Detail flyout
(`public/pages/Decoders/components/DecoderDetailsFlyout.tsx`) has a three-way **Visual / YAML / JSON** toggle
(lines 39-52) and shows an `EnabledHealth` badge (194-198), but **no diff view**. The creation/edit form
(`public/pages/Decoders/containers/DecoderFormPage.tsx`) offers **only a raw YAML editor** (`editorTypes` array
has one entry, lines 43-48) — no visual builder — validated client-side against the large generated
ECS-derived JSON Schema at
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/common/schemas/wazuh-decoders.schema.json` (imported
`DecoderFormPage.tsx:41`, used 234-236).

Server: `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/DecodersRoutes.ts` —
`POST {DECODERS_BASE}/_search` (62-73), `GET/{id}` (75-88), `POST` create (90-101), `PUT/{id}` update
(103-117), `DELETE/{id}` (119-132), `GET .../integrations/draft` (134-142);
`DECODERS_BASE = /_plugins/_security_analytics/decoders` (`server/utils/constants.ts:46`). Notably, the file
has a `FIXME` at lines 12-57 flagging that create/update bodies are **not validated server-side** (a real,
in-repo-acknowledged gap). Server service
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/services/DecodersService.ts` reads
`CONTENT_INDICES.DECODERS = 'wazuh-threatintel-decoders'` (`server/utils/constants.ts:294`) and defensively
probes multiple candidate field names for the space filter (`SPACE_FIELD_CANDIDATES`, lines 19-28) via a
`fieldCaps` call before querying — evidence of past index-mapping inconsistency in production. Writes go
through `CLIENT_DECODER_METHODS` (`server/utils/constants.ts:258-262`) with manually string-concatenated JSON
bodies (`DecodersService.ts:339-341, 385-386`).

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Decoders.ts`: `DecoderDocument`
(10-19): `id, name, enabled?, metadata, definitions?, check?, parents?: string[], normalize?`. The
`parents: string[]` field encodes a decoder dependency chain, but **no dependency-graph visualization exists
anywhere** in the Decoders UI — authoring parent/child relationships is pure manual YAML.

### 1.3 Filters

Filters has **no dedicated top-level route** — it's mounted as the second tab of the Integrations page:
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Integrations/containers/Integrations.tsx:49`
imports `FiltersTab`, mounted at lines 600-604/629 with `spaceFilter` driven by Integrations' own selector.
`ROUTES.FILTERS` (`public/utils/constants.ts:74`) exists only as a breadcrumb label, not a routed component.
`FiltersTab.tsx` loads **all** filters in one shot with `size: 10000` and no server pagination (lines 68-93),
rendering an `EuiInMemoryTable` with client-side search/sort. It uses a **filter-specific** allowed-actions
table, `FiltersAllowedActionsBySpace`
(`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/common/constants.ts:103-118`), which uniquely allows
create/edit/delete in both **Draft and Standard** spaces (Rules/Decoders/KVDBs are Draft-only) — enforced at
`FiltersTab.tsx:99-108`, with only a disabled-button tooltip explaining it (172-176, 187-190), no persistent
UI explanation of why Filters differ.

Server: `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/FiltersRoutes.ts:17-60`,
`FILTERS_BASE = /_plugins/_security_analytics/filters` (`server/utils/constants.ts:40`). Service
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/services/FiltersService.ts` extends
`MDSEnabledClientService` (line 25, multi-data-source support, unlike Rules/Decoders), reads
`CONTENT_INDICES.FILTERS = 'wazuh-threatintel-filters'` (line 37), and submits raw YAML bodies
(`Content-Type: application/yaml`, lines 70, 94) to `CLIENT_FILTER_METHODS` (`server/utils/constants.ts:270-274`).

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Filters.ts`: `FilterSource`
(27-32) uniquely includes `hash?: {sha256: string}` — a content-integrity hash unused by any UI component
(no dedup-detection feature built on it).

Gaps: buried discoverability (must land on Integrations to find Filters); no server-side pagination (`size:
10000`); no visual condition builder (`check` is raw YAML only, same limitation as Decoders).

### 1.4 KVDBs (Key-Value DBs)

`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/KVDBs/containers/KVDBs.tsx` is a full
standalone page (own breadcrumb, line 72) with server-side pagination/sort (92-159) and — uniquely among the
four resource screens — a **schema-driven `EuiSearchBar`** (lines 331-340, `KVDBS_SEARCH_SCHEMA`) supporting
field-scoped search syntax, versus the plain free-text boxes on Rules/Decoders. Detail flyout
(`components/KVDBDetailsFlyout.tsx`) has the same Visual/YAML/JSON toggle as Decoders (39-49) plus a
**structured content-preview widget** (`AssetViewer.tsx`, used at line 96) rendering the actual key-value
payload when `document.content` is present — the only content-preview widget among the four resource types
beyond raw text. The main table has no "enabled" column despite the field existing on the model.

Server: `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/KVDBsRoutes.ts` —
`POST {KVDBS_BASE}/_search` (36-45), `POST .../_integrations` (47-56, batch-resolves which integrations
reference a set of KVDB ids), create/update/delete (58-99); `KVDBS_BASE = /_plugins/_security_analytics/kvdbs`
(`server/utils/constants.ts:39`). **Correction**: an earlier pass of this document flagged
`kvdbCreateResourceSchema`/`kvdbUpdateResourceSchema` (`KVDBsRoutes.ts:21-30`, shaped `{metadata, enabled,
content}`) as validating the wrong body shape versus the actual `{resourceYaml, integrationId}` handlers.
Re-reading the file shows this is now stale: those two schema objects are defined but **never referenced** by
any `router.post/put` call — the actual create/update routes (`KVDBsRoutes.ts:58-86`) inline the correct
`schema.object({ resourceYaml: schema.string(), integrationId: schema.string() })` shape directly. There is no
functional validation bug here today, only two dead/unused local constants (a minor cleanup item, not a
correctness issue) — see the revised Part 3 item #14. (The separate Decoders `FIXME` described in §1.2, about
create/update bodies validated with `schema.any()`, is unrelated and re-confirmed still accurate.) Service
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/services/KVDBsService.ts` reads
`CONTENT_INDICES.KVDBS = 'wazuh-threatintel-kvdbs'` (`server/utils/constants.ts:295`) and also extends
`MDSEnabledClientService` (line 25).

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/KVDBs.ts`: `KVDBDocument` (10-15):
`id, metadata, enabled?, content?: Record<string, unknown>`. Note a cross-type inconsistency: `KVDBSource.space`
is typed `string | {name?: string}` (line 25) while `FilterSource.space` is strictly `{name: string}`
(`types/Filters.ts:30`) and `RuleItemInfoBase.space` is plain `string` (`types/Rule.ts:59`) — the three
resource types disagree on the shape of the same conceptual field, evidenced by defensive coercion in
`public/store/WazuhRulesStore.ts:203-213` (`normalizeSpace`).

### 1.5 Cross-cutting: Rules/Decoders/Filters/KVDBs/Integrations "spaces" model — and who is exempt from it

A Wazuh-specific draft→test→custom promotion workflow sits on top of the **catalog** resources, defined in
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/common/constants.ts`: `SpaceTypes` (23-60: DRAFT, TEST,
CUSTOM, STANDARD — four values confirmed, each with a label/value/description); `SPACE_ACTIONS` enum (66-78)
incl. `PROMOTE`, `DEFINE_ROOT_DECODER`, `REARRANGE_INTEGRATIONS`; `AllowedActionsBySpace` (80-101) /
`FiltersAllowedActionsBySpace` (103-118) tables; promotion order `UserSpacesOrder = [DRAFT, TEST, CUSTOM]`
(120-124) — **STANDARD is confirmed to be the 4th `SpaceTypes` value deliberately left out of
`UserSpacesOrder`**: it labels read-only, Wazuh-CTI-provided content ("Wazuh CTI provided resources", the
`STANDARD.description` string at line 57) that a user doesn't promote *into* via this workflow, rather than a
stage a user's own drafted content passes through. Promotion itself is only actionable from the
**Integration** bundle (`public/pages/Integrations/containers/PromoteIntegration.tsx`,
`components/PromoteModal.tsx`) — a user cannot promote a single rule/decoder/filter/KVDB independently of its
parent integration. Bulk actions everywhere are delete-only, implemented client-side as `Promise.all` over N
individual delete calls (`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/hooks/useDeleteItems.ts:60-68`)
rather than a real bulk-delete endpoint — there is no bulk enable/disable, tag, export, or promote on any of
the four resource screens.

**This model applies to Integrations, Rules, Decoders, KVDBs, and Filters — not to Detectors, and not to
Findings.** Verified per-type:
- `types/Rule.ts:59` `space?: string`; `types/Decoders.ts:24` `space?: string`; `types/KVDBs.ts:25`
  `space?: string | { name?: string }`; `types/Filters.ts:30` `space: { name: string }` (72, 76 add two more
  loosely-typed `space: string` fields elsewhere in the same file) — all four use the same `SpaceTypes` value
  set even though, as §1.4 already noted, the field's *shape* is inconsistently typed across them.
  `types/Integrations.ts:22, 42, 100, 105` likewise carries `space`/`PromoteSpaces`.
- **Detectors do not use this model at all.** `types/Detector.ts:36` types `Detector.source` as a plain
  `source?: string` (not a `SpaceTypes`-shaped field, not a union type). The real vocabulary lives in a
  Detector-specific helper, `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/utils/detectorSource.ts`:
  a two-value `DetectorSourceRaw` enum (`Standard = 'standard'`, `Custom = 'custom'`, lines 9-12) with a
  `getDetectorSourceLabel`/`isStandardSource` pair (lines 26-32) used by
  `public/pages/Detectors/containers/Detectors/Detectors.tsx:104, 290, 354` and
  `public/pages/Detectors/containers/Detector/DetectorDetails.tsx:252`. This is a simple binary
  standard-vs-custom flag, not the four-value draft→test→custom→standard promotion workflow — Detectors have
  no Draft/Test staging area and no promote action.
- **Findings do not carry a space field either** — `types/Finding.ts:9-18` (`Finding`) has no `space`
  property, and neither `Findings.tsx` nor `FindingsTable.tsx` has a space selector. This makes sense:
  Findings are generated *results* of a detector run against live data, not catalog configuration a user
  authors and promotes through environments. So of the seven core entities: **Integrations, Rules, Decoders,
  KVDBs, Filters** carry the four-value model; **Detectors** use a different, simpler standard/custom flag with
  no promotion workflow; **Findings** have no space concept at all, by design.

### 1.6 Alerts — corrected: this is not a live product surface, "Alerts" is not a current concept

**Correction vs. an earlier pass of this document, per direct feedback from the plugin's Wazuh maintainer:
"alerts is no longer a concept, is [it's] findings" for this product.** Re-verifying against
`public/pages/Main/Main.tsx` shows this is stronger than "hidden from the nav but still reachable" — the
Alerts page is **fully disconnected from the running application**, at every layer:
- **Not imported**: `Main.tsx:51-52` — `// Wazuh: hide Alerts app and routes.` / `// import Alerts from
  "../Alerts";` — the component isn't even in scope in the file that would render it.
- **Not routed**: the entire `<Route path={`${ROUTES.ALERTS}/:detectorId?`}> ... <Alerts .../> ... </Route>`
  block is wrapped in a JSX comment (`Main.tsx:811-830`, opening with `{/* Wazuh: hide Alerts route. */}` then
  `{/* <Route ...`). Because React Router never registers this path, **navigating directly to the Alerts URL
  does nothing usable** — there is no dead-but-reachable deep link here, unlike some other hidden screens in
  this plugin (see the nav-vs-route distinction drawn in §1.9). This is a correction to an earlier version of
  this document, which cited the Findings route (`Main.tsx:684`) and a Detectors route (`Main.tsx:698`) as
  evidence that "routes remain wired" for the hidden nav items — that citation was accurate for Findings, but
  not for Alerts specifically, whose own `<Route>` is commented out alongside its nav entry and its import.
- **Not in the nav**: same file, `Main.tsx:118-119` (`// Alerts = "Alerts",` in the `Navigation` enum) and
  `Main.tsx:450-476` (the whole "Insights" nav category, including the Alerts item, wrapped in
  `// Wazuh: hide Insights category and Alerts/Correlations nav items.`).

The only things still alive are: (a) the **backend HTTP routes** — `setupAlertsRoutes` is still registered in
`server/plugin.ts:117`, so `GET /_plugins/_security_analytics/alerts` and the acknowledge endpoint still work
if called directly (`server/routes/AlertRoutes.ts:15-45` → `AlertService` → `server/clusters/addAlertsMethods.ts`);
and (b) the `AlertsStore` wiring in `public/store/DataStore.ts:76` and `public/models/interfaces.ts:36`, which
exists only because other, still-live modules hold a reference to the same `services` bag — nothing in a
reachable UI path actually calls into it. **Correlations (the top-level page, distinct from a finding's
correlated-findings concept) is in the identical state**: import commented (`Main.tsx:68-71`), `<Route
path={`${ROUTES.CORRELATIONS}`}>` and its sibling Correlation Rules routes wrapped in one large JSX comment,
and the nav entries commented alongside Alerts (`Main.tsx:479-487`). Both are dead code in the sense that
matters to a product/UX audit: **not reachable by any user action, including typing a URL.**

Per the instructions for this revision: this section is kept (rather than deleted) purely as a **technical
record** — the code (`public/pages/Alerts/containers/Alerts/Alerts.tsx`, ~1178 lines: tabbed
`EuiTabbedContent` for Detection-rules/Correlations with a Threat-intel tab commented out; client-side
`EuiInMemoryTable` filtering via a date picker; single/bulk Acknowledge actions restricted to `ACTIVE` alerts;
plain-text (non-color-coded) severity rendering; a fully-commented-out chart scaffold, `getAlertsGraph`,
`Alerts.tsx:1143+`; an `AlertFlyout` that links to the originating Detector and loads related Findings) is
still present and still compiles, so a future task that touches Detector alerting/triggers should know this
UI exists in the tree. But it is **not part of the current Wazuh product surface**, and no proposal in Part 3
of this document treats it as one. Any future work that would depend on the Alerts screen being reachable
(e.g. resurfacing it, wiring a nav entry back in) should be confirmed with the Wazuh team first — per the
maintainer, disabling it was a deliberate product decision, not an oversight.

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Alert.ts`: `AlertItem` (98-108):
`id, start_time, trigger_name, detector_id, state, severity, finding_ids[], last_notification_time,
acknowledged_time`. `CorrelationAlertItem` (110-121) is the correlation-alert analog. Noted for completeness
only (this model backs a screen that is not reachable today): no assignee/comment/dismissal-reason field
exists on either alert type, and no MITRE field exists on `AlertItem` either.

### 1.7 Findings — the live, current concept (Alerts' functional replacement for this product)

Findings is **the** primary triage surface in this fork today, and is the entity the maintainer means when
correcting "alerts is no longer a concept, is findings." It is **not**, however, a top-level side-nav item —
re-verifying `Main.tsx:436-449` shows the "Findings" nav entry itself is commented out
(`// Wazuh: hide Findings nav item.`), same as Alerts. The difference that matters is that, unlike Alerts,
**Findings' `<Route>` is not commented out** — `Main.tsx:682-697` registers
`path={`${ROUTES.FINDINGS}/:detectorId?`}` rendering the live `<Findings .../>` component — and the page is
reachable through several in-app links even without a nav entry: from a detector's detail view
(`public/pages/Detectors/containers/Detector/DetectorDetails.tsx:475`,
`history.push(`${ROUTES.FINDINGS}/${detectorId}`)`), from `ThreatIntelOverviewActions.tsx:65`, and from the
(also-unmounted) Overview widgets. So the precise, non-hand-wavy classification is: **Findings is a live,
routed screen that is one click away from Detectors, but is not exposed as its own item in the visible
side-nav** — a materially different situation from Alerts/Correlations, whose routes don't exist at all.

`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Findings/containers/Findings/Findings.tsx`
has an `EuiTabbedContent` with a live Rules tab and a Threat-intel tab gated behind `THREAT_INTEL_ENABLED`
(tabs array ~570-628, "Threat intel tab is not used by Wazuh" comment at line 605).
`components/FindingsTable/FindingsTable.tsx` **does** color-code severity via `EuiBadge`/`getSeverityColor`
(~215-220, `import { getSeverityColor } from '../../../Correlations/utils/constants'` — note this import
still reaches into the otherwise-unrouted Correlations directory purely for a shared color-mapping utility,
not for the Correlations feature itself). The "Create Alert" row action is explicitly commented out for
Wazuh (`FindingsTable.tsx:29-30, 121-166, 250-343` — import, handler, and JSX all commented under repeated
`// Wazuh: hide Create Alert flow in findings table.` markers), leaving only "View details" — this is
consistent with Alerts no longer being a concept: the one place Findings used to let a user *create* an
Alert has been deliberately removed, not left as an oversight. Filters (severity, integration/log type,
detection type) are client-side only. Charting is dead code here too (`getFindingsGraph`,
`createStackedBarChart` calls commented out); a group-by control exists for a chart that never renders.

`FindingDetailsFlyout.tsx`: the **Correlations tab is entirely commented out for Wazuh**
(`CorrelationsTable` import commented, lines 61-62; `getCorrelations` method fully commented, lines 129-167;
the `CORRELATIONS` case in `getTabContent`'s switch fully commented, lines 553-576) — re-verified, current
line numbers match closely. **Important correction**: an earlier pass of this document proposed re-enabling
this tab (see the removed Part-3 proposal noted below). Per the maintainer, disabled/commented-out code in
this repo reflects a **deliberate Wazuh product decision**, not an oversight or regression — this tab was
intentionally cut alongside Alerts and the top-level Correlations page, so a user viewing a finding today has
no in-flyout path to correlated findings, by design, and re-enabling it is out of scope for this document
unless the team decides otherwise. A "View surrounding documents" link opens OSD Discover's context view
(`window.open('discover#/context/...')`, ~430-446); if no matching index pattern exists, an inline **Create
Index Pattern modal** appears (~499-551) — functional but high-friction. **Confirmed bug, still present**:
`createFindingDetails` hardcodes `const severity = 'High';` (`FindingDetailsFlyout.tsx:588`, re-verified) for
the threat-intel-feed severity badge, ignoring the actual finding/indicator severity. This is a plain
correctness bug (not a disabled-feature question) and is unaffected by the Alerts/Correlations corrections
above.

Server: `GET /_plugins/_security_analytics/findings/_search` →
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/FindingsRoutes.ts:15-35`.

Data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Finding.ts`: `Finding` (9-18):
`id, detectorId, document_list[], index, queries[], related_doc_ids[], timestamp, detectionType`. `Query`
(20-28) carries `severity`/`tags`/`category` **per matched rule query**, not on `Finding` itself — the UI
cross-references `finding.queries[].id` against loaded rules client-side (`Findings.tsx:540-567`) to display
severity/tags, a fragile enrichment pattern that produced the hardcoded-severity bug above. `Finding` has no
triage/acknowledgment state — only Alerts model state.

### 1.8 Detectors, CreateDetector / WazuhCreateDetector, Correlations

**Detectors list**
(`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Detectors/containers/Detectors/Detectors.tsx`):
columns Name / Status (derived from `enabled`, line 103) / Integration / **Space** (Wazuh-added, 259-264,
`getDetectorSourceLabel`) / active-rules-count / last-updated. Bulk delete is disabled if any selected
detector's `source` is `"standard"` (288-312, tooltip "Only Custom detectors can be deleted"); a single-select
Start/Stop toggle exists (192-212, `toggleDetector`, 125-146) via `PUT /_plugins/_security_analytics/detectors/{id}`
(`server/routes/DetectorRoutes.ts:50-62`).

**CreateDetector vs WazuhCreateDetector — verified relationship**: `WazuhCreateDetector` is **not a separate
route**; it's a narrow override of one sub-step. `ROUTES.DETECTORS_CREATE` (`public/utils/constants.ts:63`) is
served solely by `public/pages/CreateDetector/containers/CreateDetector.tsx`. Its `DefineDetector` step
(`public/pages/CreateDetector/components/DefineDetector/containers/DefineDetector.tsx:12`) imports
`DetectorType` **from** `WazuhCreateDetector/components/DefineDetector/components/DetectorType`, which adds a
**Space selector** and **Integration combo box** filtered by space
(`public/pages/WazuhCreateDetector/components/DefineDetector/components/DetectorType/DetectorType.tsx:8,
14-17, 44-59`). Substantively, **the "Configure Alerts" wizard step is hidden for Wazuh**
(`CreateDetector.tsx:23-24, 28-29`, comment "hide Configure Alerts step in detector creation wizard") — users
cannot configure severity-based alert triggers (`AlertCondition`, `types/Detector.ts`) during creation, even
though the model and a post-creation edit UI (`AlertTriggerView.tsx`, `UpdateAlertConditions.tsx`, itself
also route-disabled per §1.6/§1.9) both still exist. This is consistent with, not incidental to, §1.6's
finding that Alerts is no longer a product concept here: a Detector's `triggers: AlertCondition[]` still
exists on the data model and the upstream OpenSearch Security Analytics plugin still generates `AlertItem`
records from it server-side, but there is now no reachable UI anywhere in this fork — at creation or after —
for a user to configure or view those triggers/alerts. Treat `AlertCondition`/`triggers` as a vestigial,
backend-only concept from a UX perspective until/unless the team reintroduces an Alerts-equivalent surface.

Detector data model — `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Detector.ts`: `Detector`
(25-37): `id, type, name, enabled, schedule{period}, inputs[]{detector_input{indices[], pre_packaged_rules[],
custom_rules[]}}, triggers: AlertCondition[], threat_intel_enabled, source?`. `AlertCondition`
(`types/Alert.ts:6-24`): `types[], sev_levels[], tags[], ids[], actions, severity, detection_types[]` — no
MITRE field on Detector.

**Correlations — also re-verified as fully disconnected from the running app, same as Alerts.**
`Main.tsx:68-71` comments out the imports for `Correlations`/`CorrelationRules`/`CreateCorrelationRule`; the
`<Route path={`${ROUTES.CORRELATIONS}`}>` and its Correlation-Rules sibling routes are wrapped in one large
JSX comment block alongside the Alerts route; and the nav entries are commented out with Alerts
(`Main.tsx:479-487`, "Wazuh: hide Insights category and Alerts/Correlations nav items"). So, like Alerts,
Correlations-the-top-level-page cannot be reached by any user action today, including a direct URL — this
corrects an earlier version of this document, which described the Correlations page
(`public/pages/Correlations/containers/CorrelationsContainer.tsx`) as a live screen with a Table/Graph
toggle. It still exists as source and is worth recording for the same reason as Alerts: its **Graph** view
(`CorrelationGraph.tsx`, using `react-graph-vis`/`vis-network`, color-coded by severity) is the only nontrivial
data-visualization component anywhere in the Alerts/Findings/Detectors/Correlations family (no
`@elastic/charts`/`recharts` usage in any of these directories), and its per-row
`CorrelationsTableFlyout.tsx` uniquely renders an **"Observed MITRE Attack Tactics"** panel (badges built from
`finding.detectionRule.tags`, linking to `attack.mitre.org`). Both are unreachable in the current product,
but the *component code* for the MITRE badge pattern is intact and importable — Part 3 proposal #3 reuses
that rendering pattern (not the page) inside the live Findings flyout, which is not the same thing as
restoring the disabled Correlations page itself. The underlying `tags` data is already loaded into Findings
too (`Findings.tsx`) but never rendered as MITRE badges there today. Correlation *alerts* (acknowledge/state)
lived on the (also now-unreachable) Alerts page's Correlations tab.

Server routes:
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/CorrelationRoutes.ts` — rule CRUD
(15-49, 78-89), `GET .../findings/correlate` (51-63), `GET .../correlations` (65-76), `GET
.../correlationAlerts` + `POST .../_acknowledge/correlationAlerts` (91-110). Data model —
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/types/Correlations.ts`: `CorrelationRule` (53-62):
`name, time_window (ms), queries: CorrelationRuleQuery[], trigger?`; `CorrelationRuleQuery` (40-45):
`logType, index, field, conditions: CorrelationFieldCondition[]` — plain field-value AND/OR matching across
log-type indices, not a general graph DSL.

### 1.9 Overview, Dashboards, Integrations, LogTypes, LogTest, ThreatIntel

**Overview is dead code.** `public/pages/Overview` is not mounted by any registered app and not routed —
its only reference in `public/` is a commented-out import
(`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Main/Main.tsx:49`). The nav entry
labeled "Overview" in the side nav actually navigates to the **Integrations** app instead
(`server/plugin.ts:155-167` registers it; `Main.tsx:420-435`). Widgets besides `RecentFindingsWidget` are
explicitly commented out in `Overview.tsx` (325-333): `RecentAlertsWidget`, `Summary` (the
alerts+findings-count chart), `TopRulesWidget`, `RecentThreatIntelFindingsWidget`. The chart-drawing utility
itself, `public/utils/chartUtils.tsx`, has its Chart.js logic fully commented out (lines 6-30+), and there is
**no `@elastic/charts` or `recharts` dependency in `package.json`** — confirmed no charting library is
actually available in the bundle today except `react-graph-vis` (used only by Correlations, §1.8). A latent
bug (`Overview.tsx:175`, calling `setTimeUnit` when both it and `timeUnits` are commented out) confirms this
code is unmaintained/never executed.

**Dashboards is an empty placeholder.**
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Dashboards/containers/Dashboards/Dashboards.tsx:19-21`
renders only `<ContentPanel title={'Dashboards'}></ContentPanel>` with no data fetching and is not referenced
by any route or app registration — an orphaned stub, presumably intended for future log-volume/alert-trend
dashboards.

**LogTypes is also dead code** in this fork, superseded by Integrations (nav renamed, `Main.tsx:122-123`; all
`ROUTES.LOG_TYPES` routes commented out, `Main.tsx:1009-1060`).

**Integrations** (live, real screen — the actual "Overview" nav destination):
`public/pages/Integrations/containers/Integrations.tsx` — catalog table with Integrations/Filters tabs
(`OVERVIEW_TAB`, 96-102), space selector, bulk delete, drag-reorder (`RearrangeIntegrations.tsx`), and
promote-to-space flow (`PromoteIntegration.tsx`). Data loads via `DataStore.policies.searchPolicies` (106-116).
Server: `/mnt/persist/wazuh/wazuh-dashboard-security-analytics/server/routes/IntegrationRoutes.ts` (create
31-56, search 63-67, update 69-107, promote 109-135, delete 137-149); the underlying cluster transport
(`server/clusters/addIntegrationsMethods.ts:1-62`) targets a **separate Wazuh-specific plugin surface**,
`/_plugins/_content_manager/integrations` and `/_plugins/_content_manager/promote` — distinct from the
`/_plugins/_security_analytics` base path used by Rules/Alerts/Findings/Detectors/LogTypes/ThreatIntel. Search
reads `CONTENT_INDICES.INTEGRATIONS = 'wazuh-threatintel-integrations'`
(`server/utils/constants.ts:293`, used at `server/services/IntegrationService.ts:84,258`).

**LogTest** (live, Wazuh-specific):
`public/pages/LogTest/containers/LogTest.tsx` — space selector, `LogTestForm` (location, trace level,
metadata key/value editor, integration combo box, raw log textarea), `LogTestResult` (tabbed
Normalization/Detection output). Execute → `POST {LOG_TEST_BASE}`
(`server/utils/constants.ts:41`) → `server/services/LogTestService.ts:20-93` → cluster transport
`server/clusters/addLogTestMethods.ts:8-16`, real path `POST /_plugins/_content_manager/logtest` (again the
content-manager surface, not an OpenSearch index query). Result rendering shows rule matches with severity
badges and a clickable link back to `ROUTES.RULES` (`LogTest.tsx:275-279`). **No persistence/history** —
`handleClearSession` just resets local component state (196-200); there is no "recent tests" list, despite
this being a natural, low-effort win given the request/response shapes are already fully typed
(`types/LogTest.ts:1-85`).

**ThreatIntel** (live but hidden from the primary side-nav category per a Wazuh comment, `Main.tsx:124`,
though still reachable via routes when `THREAT_INTEL_ENABLED`): `ThreatIntelOverview.tsx` — Sources list +
Scan configuration tabs. `IoCsTable.tsx` — paginated table (Value/Type/IoC matches/Created/Severity/Last
updated). Source types match `ThreatIntelIocSourceType`
(`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/common/constants.ts:17-21`: `S3_CUSTOM`,
`IOC_UPLOAD`, `URL_DOWNLOAD`). Client-side, the IOC-type filter dropdown queries
`.opensearch-sap-ioc*` directly (`public/services/OpenSearchService.ts:73`, `getIocTypes`) — the one
hardcoded raw-index literal found outside the `wazuh-threatintel-*` catalog family. Scan configs are stored as
OpenSearch Alerting monitors (inferred from an error-string check against `.opendistro-alerting-config`,
`public/services/ThreatIntelService.ts:212`).

**Index/backend inventory** (repo-wide grep): two distinct backend surfaces exist —
`/_plugins/_security_analytics` (`server/utils/constants.ts:15`, upstream OpenSearch Security Analytics
plugin: detectors, rules, alerts, findings, log types, threat intel) and `/_plugins/_content_manager`
(`server/utils/constants.ts:289`; also `server/clusters/addIntegrationsMethods.ts:3`,
`addDecoderMethods.ts:8`, `addPoliciesMethods.ts:3`; Wazuh-specific plugin: integrations, decoders, KVDBs,
filters, wazuh rules, log test, promote). Six `wazuh-threatintel-*` indices back the content-manager catalog
(`server/utils/constants.ts:291-298`: `policies`, `integrations`, `decoders`, `kvdbs`, `filters`, `rules` —
note the misleading name, these are **not** threat-intel data). **No `wazuh-alerts-*` or
`wazuh-monitoring-*` index literal was found anywhere in `public/`/`server/`/`common/`/`types/`** — this
plugin does not query the core Wazuh alert indices directly; alert/finding data comes exclusively from the
OpenSearch Security Analytics plugin's own APIs.

**Main.tsx** wires all of the above (class component,
`/mnt/persist/wazuh/wazuh-dashboard-security-analytics/public/pages/Main/Main.tsx`). Side-nav groups actually
shown: Security Analytics root → (optional) Threat Intel → Overview (→ Integrations) → Normalization
(Decoders, KVDBs) → Detection (Detectors, Rules) → Log test (`getSideNavItems`, ~370-611). Re-verified,
precisely, what "commented out" means for each hidden item — they are **not** all the same:
- **Findings**: nav entry commented (`436-449`), but its `<Route>` is live and rendering
  (`682-697`) — reachable via direct URL and via in-app links from Detectors/ThreatIntel/Overview (see §1.7).
  A real "hidden from top nav, one click away" case.
- **Alerts, Correlations, Correlation Rules, LogTypes**: nav entries commented, **and** their `<Route>`
  blocks are also wrapped in JSX comments (`811-1060` region), **and** their component imports are commented
  out at the top of the file (`Main.tsx:47-71`). These are fully dead in the browser — no route exists to
  match a direct URL. (An earlier version of this document described the Alerts/Detectors routes at lines
  684/698 as evidence that hidden nav items' routes "remain wired" — 684 is in fact the live Findings route,
  and 698 is the live Detectors route; neither is evidence about Alerts, whose own route block is separately
  and entirely commented out. This has been corrected in §1.6/§1.8 above.)
- **Overview and Dashboards**: never had a live route to begin with in this fork (Overview's import is
  commented, `Main.tsx:49`; Dashboards is an orphaned stub referenced by no route or app registration at
  all) — distinct again from "hidden nav item with a live route."

So the accurate three-tier picture is: (1) **top-nav + live route** — Integrations (as "Overview"), Decoders,
KVDBs, Detectors, Rules, LogTest, optionally Threat Intel; (2) **no top-nav entry, but a live route reachable
by URL/in-app link** — Findings, and Filters (reachable as a tab inside Integrations, `ROUTES.FILTERS` itself
is breadcrumb-only per §1.3); (3) **no nav entry and no live route at all** — Alerts, Correlations,
Correlation Rules, LogTypes, Overview-the-page, Dashboards-the-page. Tier 3 is not "arguably still there";
it cannot be reached by a user under any circumstance without code changes.

---

## Part 2 — Competitor / best-practice UI-UX reference

- **Elastic Security** — the detection-rules table supports multi-select **Bulk actions** (Export,
  Enable/Disable, and an idempotent Edit that adds/removes tags, index patterns, and schedules across many
  rules at once). [Manage detection rules](https://www.elastic.co/guide/en/security/current/rules-ui-management.html) ·
  [Bulk actions API](https://www.elastic.co/guide/en/security/current/bulk-actions-rules-api.html)
- **Splunk Enterprise Security** — Risk-Based Alerting routes low-signal "risk events" into a single risk
  index; a **risk incident rule** aggregates multiple risk events tied to the same entity into one
  higher-confidence **risk notable**, reducing per-event alert fatigue in favor of entity-centric triage.
  [How risk-based alerting works](https://help.splunk.com/en/splunk-enterprise-security-7/risk-based-alerting/7.3/introduction/how-risk-based-alerting-works-in-splunk-enterprise-security) ·
  [Risk notables](https://help.splunk.com/en/splunk-enterprise-security-7/risk-based-alerting/7.3/identify-threat/risk-notables-in-splunk-enterprise-security)
- **Microsoft Sentinel** — the incident details page has tabs for Timeline, Alerts, Entities, Similar
  incidents, and Comments; closing an incident requires selecting a mandatory **classification reason**
  (True Positive / Benign Positive / False Positive – logic / False Positive – data / Undetermined), which
  both documents outcomes and becomes tuning signal.
  [Investigate incidents with Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/investigate-cases)
- **Datadog** — the Log Patterns view automatically clusters queried logs (default: by similar `message`
  values, grouped by Status/Service) so an analyst can spot a noisy or anomalous pattern without hand-writing
  a query, and can pivot into faceted search from a cluster.
  [Grouping Logs Into Patterns](https://docs.datadoghq.com/logs/explorer/analytics/patterns/)
- **Panther** — offers a console rule editor (a "Simple Detection builder" plus raw Python/YAML), inline
  test-case authoring, and a CLI-based (Panther Analysis Tool) workflow for git-backed detection-as-code —
  the console and code paths are treated as equally first-class authoring surfaces.
  [Panther detection rules](https://docs.panther.com/detections/rules)
- **Google SecOps (Chronicle)** — the YARA-L Rules Editor includes an inline **UDM field lookup** tool, a
  natural-language-to-query assistant, and an in-editor **Run test** action that executes the rule against a
  chosen time range and shows matched/unmatched sample events before the rule is deployed.
  [Edit rules in the Rules Editor](https://docs.cloud.google.com/chronicle/docs/detection/manage-all-rules) ·
  [Get started with YARA-L](https://docs.cloud.google.com/chronicle/docs/yara-l/getting-started)

(Elastic's Timeline, Honeycomb's BubbleUp, and a live Chronicle timeline view were not reachable via primary
docs during this session and are omitted rather than described from memory; the five patterns above are
sufficient to ground Part 3.)

---

## Part 3 — Prioritized proposals

Each proposal cites the exact code/data backing it and states which competitor pattern (or "general best
practice") it draws from. Proposals are scoped to **existing, live** fields/routes — nothing here requires
data the plugin doesn't already have, and nothing here proposes re-enabling functionality the Wazuh team
deliberately disabled (see §1.6/§1.8 and the audit note below).

**Audit note on this revision.** Every proposal below was re-checked against two corrected facts: (1) Alerts
and the top-level Correlations page are not reachable in the running app today (§1.6, §1.8) — a proposal that
only makes sense on those screens has no place here; (2) disabled/commented-out code in this repo
(Correlations tab in Finding Details, the Threat-intel tab, LogTypes, Overview, Dashboards, the upstream
Rules import flow, the Alerts/Correlations pages themselves) reflects a **deliberate Wazuh product decision**,
not a bug or an oversight, so "turn it back on" is not a valid proposal shape here — the one exception is a
literal in-repo `FIXME`/`TODO` that explicitly asks for follow-up work (the Decoders stale-validation-schema
FIXME, kept in #13 below). Compared with the previous version of this document: **one proposal was removed
outright** (restoring the Finding Details Correlations tab — it directly violates the audit rule with no
FIXME backing it), **three were retargeted or narrowed** (severity color-coding, MITRE tags, "similar items"
grouping — all moved from the dead Alerts page onto the live Findings page), **one was dropped** (mandatory
closing classification — it has no Findings analog, since Findings carries no acknowledgment/triage state at
all), **two had a "revive the disabled Overview page" option removed** (the alert-trend chart and the
Dashboards proposal — Overview was deliberately hidden, so it stays out of scope; the un-routed Dashboards
*stub*, by contrast, was never wired up to begin with and isn't a "restore a disabled feature" case), and
**one gap-analysis item was corrected** (the KVDB "stale schema" finding turned out to be stale itself — see
#13). The rest are unchanged.

### P0 — High priority

1. **Bulk enable/disable for Rules, Decoders, KVDBs.**
   Screen: `public/pages/WazuhRules/containers/Rules/Rules.tsx`, `public/pages/Decoders/containers/Decoders.tsx`,
   `public/pages/KVDBs/containers/KVDBs.tsx`. Add a bulk "Enable selected" / "Disable selected" action next to
   the existing "Delete selected" action in each page's Actions popover, using the same
   `Promise.all`-over-`updateRule`/`updateDecoder`/`updateKVDB` pattern already used for bulk delete
   (`public/hooks/useDeleteItems.ts:60-68`), toggling the `enabled` boolean that already exists on all three
   models (`types/Rule.ts:enabled`, `types/Decoders.ts: DecoderDocument.enabled?`, `types/KVDBs.ts:
   KVDBDocument.enabled?`) via the existing `PUT` routes (`server/routes/RuleRoutes.ts`,
   `DecodersRoutes.ts:103-117`, `KVDBsRoutes.ts:72-86`). No new backend work required. Inspired by: Elastic
   Security's bulk Enable/Disable action on the rules table. *(Unchanged from the prior version — no
   Alerts/disabled-feature dependency.)*

2. **Fix the hardcoded "High" severity bug in Finding Details.**
   Screen: `public/pages/Findings/components/FindingDetailsFlyout.tsx:588`
   (`createFindingDetails`). Replace the hardcoded `const severity = 'High'` with the actual severity read
   from the matched `Query.severity` (`types/Finding.ts:20-28`) or `ThreatIntelIocData.severity`
   (`types/ThreatIntel.ts:158-172`) for the row being rendered. This is a correctness bug, not a UX
   enhancement, but it directly misleads analysts triaging threat-intel findings and should ship with any
   Findings-page UX work. *(Unchanged — a plain bug on a live page, independent of the Alerts corrections.)*

3. **Surface MITRE ATT&CK tags on the Findings detail view.**
   *(Retargeted: the prior version of this proposal also targeted `AlertFlyout.tsx` on the Alerts page; that
   half is dropped since Alerts is not reachable in the running app, §1.6.)* Screen:
   `public/pages/Findings/components/FindingDetailsFlyout.tsx`. Reuse the existing "Observed MITRE Attack
   Tactics" **rendering pattern** already built in
   `public/pages/Correlations/components/CorrelationsTableFlyout.tsx:174-204` (badges built from
   `detectionRule.tags`, linking to `attack.mitre.org`) — importing/adapting that component into the live
   Findings flyout is a new feature on a live screen, not a restoration of the disabled Correlations *page*
   itself, so it does not conflict with the audit rule above. The underlying `tags` data is already loaded in
   Findings (`Findings.tsx` sets finding tags from the matched rule) — this is a rendering gap, not a data
   gap. Inspired by: Microsoft Sentinel's incident page, which surfaces mapped MITRE tactics/techniques
   directly on the incident details view.

~~#4. Restore the Correlations tab inside Finding Details.~~ **Removed in this revision** (no replacement
   number is reused below, to keep this document's numbering stable against the prior version). The prior
   version
   proposed re-enabling `FindingDetailsFlyout.tsx`'s commented-out Correlations tab (`getCorrelations`,
   ~129-167; tab case, ~553-576; import, 61-62). Per the maintainer, this was a deliberate Wazuh decision
   (consistent with disabling the top-level Correlations page and Alerts entirely, §1.6/§1.8), not an
   oversight, and there is no in-repo `FIXME`/`TODO` asking for it back — so it fails the audit rule in this
   revision and is dropped rather than rewritten. If the team decides correlated-findings-in-flyout is wanted
   again, that is a product decision to make explicitly, not something this document should recommend as a
   "quick win."

### P1 — Medium priority

5. **Add a lightweight Detector-scoped findings-trend chart using data already fetched.**
   *(Narrowed: the prior version offered "or a revived `public/pages/Overview`" as an alternate screen;
   removed here, since Overview was deliberately hidden by Wazuh — reviving it is out of scope per the audit
   rule.)* Screen: `public/pages/Detectors/containers/Detector/DetectorDetails.tsx` (the live per-detector
   detail view). The disabled `Overview` page's `RecentFindingsWidget`/`OverviewViewModel.ts` already
   demonstrate the query shape needed (`DataStore.findings.getFindingsPerDetector`) — reuse that *query*, not
   the page, to build a simple findings-count sparkline/bar directly on `DetectorDetails.tsx`, which is
   already a live, routed screen (`Main.tsx:940+`, `ROUTES.DETECTOR_DETAILS`). Since there is no
   `@elastic/charts`/`recharts` dependency in `package.json` today, use plain EUI (`EuiIcon`, CSS bars) or add
   a lightweight dependency deliberately, rather than assuming a charting library is already available.
   Inspired by: general SIEM best practice of showing volume-over-time context next to a detector/rule
   (Elastic Security's rule execution history sparkline is the closest analog).

6. **Reduce noise with a "similar findings" grouping, using existing fields only.**
   *(Retargeted: the prior version proposed this for the Alerts page, grouping by `AlertItem.trigger_name` /
   `detector_id`; Alerts is not reachable, so this is moved to Findings, which has an analogous shape.)*
   Screen: `public/pages/Findings/containers/Findings/Findings.tsx`. `Finding` already carries `detectorId`
   and `queries[]` (each with an `id`/`name`, `types/Finding.ts:9-28`) — group/collapse the findings table by
   `(detectorId, queries[].id)` client-side (no new backend endpoint needed, this is purely a client-side
   grouping change on the existing `EuiInMemoryTable`) so repeated matches of the same rule against the same
   detector collapse into one row with a count, expandable to the individual instances. This is a scoped-down
   version of Splunk ES's risk-notable aggregation (entity-centric grouping of repeated low-signal events)
   that's achievable with data the plugin already has, without building a full risk-scoring pipeline.

7. **Add a "recent tests" history list to LogTest.**
   Screen: `public/pages/LogTest/containers/LogTest.tsx`. Currently `handleClearSession` discards all state
   locally and `DataStore.logTests.executeLogTest` results are never persisted beyond the current view. Add a
   browser-local (not server-persisted — no saved-object type exists for this plugin, see architecture note)
   session history list of the last N test runs (space, integration, log line, result summary), using the
   already-fully-typed `LogTestRequestBody`/`LogTestResponse` (`types/LogTest.ts:1-85`). This avoids
   re-typing/re-pasting log lines when iterating on a rule. Inspired by: Google SecOps's in-editor "Run test"
   results panel, which keeps recent test runs visible while iterating on a rule. *(Unchanged — LogTest is
   the cross-cutting tool referenced in the corrected entity list, and this proposal never depended on
   Alerts.)*

~~#8. Mandatory closing classification for Alert acknowledgment.~~ **Dropped in this revision.** The prior
   version proposed adding a required dismissal-reason field to the Alerts acknowledge flow
   (`AlertFlyout.tsx`, `AlertRoutes.ts`), inspired by Microsoft Sentinel's mandatory incident-classification
   step. Per the corrected understanding in §1.6, that screen is not reachable in the current product, and —
   unlike the severity-color and MITRE-tag proposals above — there is **no Findings analog to retarget it
   to**: `Finding` has no acknowledgment/triage/state field at all (§1.7), so "add mandatory classification to
   closing a finding" isn't a rendering gap on top of existing data, it would be a net-new triage/state
   feature for Findings. That's a legitimate idea, but it is a different, larger proposal than "restore this
   UI on the entity that replaced Alerts," so it's dropped here rather than stretched to fit.

9. **Promote a single Rule/Decoder/Filter/KVDB without going through its parent Integration.**
   Screens: `public/pages/WazuhRules/containers/Rules/Rules.tsx`,
   `public/pages/Decoders/containers/Decoders.tsx`, `public/pages/Filters/components/FiltersTab.tsx`,
   `public/pages/KVDBs/containers/KVDBs.tsx`. The `SPACE_ACTIONS.PROMOTE` action and `UserSpacesOrder`
   (draft→test→custom, `common/constants.ts:66-78, 120-124`) already exist as concepts, and promotion is
   already implemented end-to-end for Integrations
   (`public/pages/Integrations/containers/PromoteIntegration.tsx`,
   `server/routes/IntegrationRoutes.ts:109-135`) — expose the same action (row-level "Promote" menu item +
   confirm modal) on the four resource tables for their own space transitions, calling the equivalent
   per-resource update endpoints with a `space` field change. Per §1.5, this applies to Rules/Decoders/
   Filters/KVDBs specifically because those are exactly the entities that carry the four-value space model —
   Detectors and Findings are correctly out of scope for this proposal. General best practice (avoid forcing
   a workflow detour through an unrelated parent object to perform a single-resource action). *(Unchanged.)*

### P2 — Lower priority / longer-term

10. **Build a real Dashboards screen backed by a new aggregation endpoint.**
   *(Narrowed: the prior version also offered "a revived `public/pages/Overview`" as a target; removed, since
   Overview was deliberately hidden by Wazuh and reviving it is out of scope per the audit rule. The
   `Dashboards` stub is different: it was never wired to a route or app registration at all — an orphaned,
   half-built placeholder rather than something Wazuh actively turned off — so building it out doesn't
   conflict with the "don't re-enable disabled things" rule.)* Screen: `public/pages/Dashboards` (currently
   an empty stub rendering only `<ContentPanel title={'Dashboards'}>`, with no route or app registration
   pointing at it — building this out would also require registering a route/nav entry, which is itself a
   product decision the team should confirm). This is the only proposal in this document that requires new
   backend work: today there is no time-series aggregation endpoint for finding volume
   (`server/routes/MetricsRoutes.ts`/`server/services/MetricsService.ts` is UI-click telemetry only, not
   query-able data). A minimal version could reuse the existing `findings/_search` endpoint with
   date-histogram aggregation params added server-side, then render with EUI stat/sparkline components (no
   new plugin dependency required for a minimal version; a full histogram may justify adding a charting
   library, since none is currently bundled). Inspired by: Datadog's faceted, pattern-based log exploration
   and general SIEM dashboard conventions — kept last/lowest priority because it is the only item requiring
   new server-side aggregation work rather than surfacing data that already exists, and because it also
   requires a nav/route decision the team hasn't made yet.

11. **Visual decoder dependency graph.**
   Screen: `public/pages/Decoders/components/DecoderDetailsFlyout.tsx` /
   `public/pages/Decoders/containers/DecoderFormPage.tsx`. `DecoderDocument.parents?: string[]`
   (`types/Decoders.ts:10-19`) already encodes the decoder chain, but there is no visualization of it — add
   a simple node/edge graph (the plugin already depends on `react-graph-vis`/`vis-network` for the disabled
   `CorrelationGraph.tsx`, so no new dependency is needed — again, reusing a library/component, not reviving
   the disabled Correlations page it currently ships in) showing a decoder's parent/child chain, with
   click-through to each related decoder's flyout. Inspired by: general best practice for making implicit
   dependency structures explorable (loosely analogous to Sentinel's investigation graph, applied to
   configuration objects instead of security entities). *(Unchanged.)*

12. **Version history / diff view for Rules, Decoders, Filters, KVDBs.**
    All four resource screens' detail flyouts show only current state. OpenSearch document versioning
    (`RuleInfo._version`, `types/Rule.ts:50`) exists in the model but no history is retained or exposed by
    any route today — this would require a genuinely new backend capability (either enabling
    `_source`-history tracking in the content-manager plugin or storing revisions in a new index), so it's
    correctly deprioritized to P2 despite being a common ask; flagging here so it's not proposed as a
    "quick win" it isn't. General best practice (config-as-code diffing), loosely inspired by Panther's
    git-backed detection-as-code model — full parity with that would mean a much larger investment
    (git integration) than the dashboards plugin alone can deliver. *(Unchanged.)*

13. **Fix the Decoders server-side validation-schema FIXME found in Part 1.**
    *(Corrected: the prior version framed this as "two stale server-side validation schema issues," one each
    in Decoders and KVDBs. Re-reading `KVDBsRoutes.ts` for this revision shows the KVDB half is stale — the
    `{metadata, enabled, content}`-shaped schemas at `KVDBsRoutes.ts:21-30` are unused dead code; the actual
    `router.post`/`router.put` calls at `KVDBsRoutes.ts:58-86` already validate the correct
    `{resourceYaml, integrationId}` shape, so there is no live KVDB validation bug today, only two unused
    constants worth deleting as routine cleanup — not worth a numbered proposal on its own.)* Not a UX
    feature but flagged because it blocks safely shipping bulk actions (#1) with confidence:
    `server/routes/DecodersRoutes.ts` has a genuine, still-current, in-repo-acknowledged `FIXME` (comment at
    lines 12-13: "These schemas are no longer used to validate the create and update endpoints... we should
    create new validation here or validate the decoder in the server endpoint") sitting above the real
    `create`/`update` routes, which validate their bodies with `schema.any()` — i.e., no server-side shape
    validation at all. This is exactly the kind of explicit in-repo ask that's a legitimate exception to the
    "don't re-enable disabled things" rule in this revision (it isn't disabled functionality — it's an
    acknowledged gap the code itself flags as needing follow-up). Recommend fixing alongside #1 so new
    bulk-write traffic doesn't rely on unvalidated schemas.

---

## Notes on what was intentionally excluded

- No MITRE ATT&CK **heatmap** is proposed: MITRE data exists only as a flat `tags`/`mitre` YAML field per
  rule (`types/Rule.ts:23, 30`), with no structured tactic/technique taxonomy field to aggregate into a
  matrix — the existing "list of linked badges" pattern (already built as a component in the disabled
  Correlations page, and reused for Findings in proposal #3 above) is the ceiling of what's supportable
  without a data-model change.
  <br>See also: existing MITRE surfacing precedent (component code, not a live page) at
  `public/pages/Correlations/components/CorrelationsTableFlyout.tsx:174-204`.
- No entity-centric "risk score" page is proposed (full Splunk RBA-style risk index): there is no risk/entity
  index or scoring pipeline in this plugin (`CorrelationFinding.correlationScore?` exists,
  `types/Correlations.ts:28-38`, but is correlation-specific, not a general entity risk score, and lives on
  the disabled Correlations feature besides) — proposal #6 above ("similar findings" grouping) is scoped down
  to what the existing, live Findings fields support.
- No embeddable-OSD-visualization proposal: `opensearch_dashboards.json` does not declare `visualizations` or
  `dashboard` as a required/optional plugin dependency, so embedding OSD's native visualization/dashboard
  framework would require a new cross-plugin contract, not just a UI change.
- No proposal reintroduces Alerts, the top-level Correlations page, LogTypes, Overview, or the Finding
  Details Correlations tab. Per the maintainer, all five were deliberately disabled/superseded for this fork
  (Findings replaces Alerts conceptually; Integrations replaces LogTypes; Overview and the top-level
  Correlations page and its embedded tab have no current replacement and no in-repo ask to bring them back).
  Reviving any of them is a product decision for the Wazuh team to make explicitly — it is out of scope for a
  UI/UX improvement proposal to assume it as a starting point.
