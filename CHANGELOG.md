## [v5.0.0]

### Added

| Issue | Comment |
| ----- | ------- |
| [#23](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/23) | Added KVDBs management feature with detailed views |
| [#21](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/21) | Added Decoders management feature |
| [#32](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/32) | Added Integrations management feature |
| [#42](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/42) | Added Log test feature |
| [#55](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/55) | Added space persistence when navigate |
| [wazuh-dashboard-plugins#8164](https://github.com/wazuh/wazuh-dashboard-plugins/issues/8164) | Added Filters management feature |
| [#184](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/184) | Added clear space action to the Overview actions button |
| [#257](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/257) | Added modifiers in the dropdown inside the rule creation and edition form |
| [#307](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/307) | Added URL-based rule navigation from Log Test detection results |
| [#342](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/342) | Added `opensearch_security_analytics.disabledSettings` configuration to hide specific settings in the UI about Index discarded/unclassified events |
| [#356](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/356) | Added date formatter that respects the dateFormat advanced setting |
| [#382](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/382) | Added a callout to promote pending changes between spaces |
| [#430](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/430) | Unify search, Status/Integration filters and URL-persisted list state across Rules, Decoders, KVDBs, Integrations, Filters and Detectors; add a clickable Integration column CTA to jump to related Decoders/Rules/KVDBs and Detectors |
| [#459](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/459) | Added a documentation link and a brief explanation of each Trace level option to the Log test page |
| [#473](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/473) | Added a Cascade view to an integration's decoders that draws the parent hierarchy as a diagram, with a legend for each decoder state, path tracing on hover and warnings for parent cycles, external parents and truncated hierarchies |

### Changed

| Issue | Comment |
| ----- | ------- |
| [#10](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/10) | Renamed Log types to Integrations |
| [#10](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/10) | Restructured the Ruleset management main menu navigation |
| [#25](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/25) | Hide the Alerts, Correlations and Correlation rules apps from the Ruleset management navigation |
| [#51](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/51) | Changed the management of rules |
| [#51](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/51) | Renamed Detection rules to rules |
| [#110](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/110) | Updated Detectors management feature |
| [#162](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/162) | Rules table and details now display the real integration title |
| [#354](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/354) | Removed the getLogTypeLabel usage across Ruleset management |
| [#447](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/447) | Improved the Ruleset management UX: unified the user-facing terminology and documented it in `TERMINOLOGY.md`, said what each entity and space is for, added a "How ruleset management works" flyout, told the user what to do next on empty lists, replaced the log test status code with a plain-language verdict, gave the remaining dead ends a cause, paired asset identifiers with their name so the root decoder reads as a name instead of `decoder/core-wazuh-message/0`, labelled each compliance framework's values with its own unit, and made the space policy panel legible: consistent booleans, enrichments as badges, and a hint on every setting saying what it affects |
| [#471](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/471) | Renamed the user-facing "Security Analytics" references to "Ruleset management", including the navigation group label, the app title, the root breadcrumb and the "How ruleset management works" flyout |

### Removed

| Issue | Comment |
| ----- | ------- |
| [#10](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/10) | Removed Threat Intelligence section entirely |
| [#127](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/127) | Removed the Findings app from the Ruleset management plugin |

### Fixed

| Issue | Comment |
| ----- | ------- |
| [#7](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/7) | Fixed YAML Editor when creating or editing detection rules |
| [#39](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/39) | Fixed detection rule editor causing blank screen |
| [#314](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/314) | Fixed rule JSON viewer showing the detection field as a YAML string instead of a structured object |
| [#112](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/112) | Fixed data source didn't include data stream aliases for detector creation |
| [#188](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/188) | Fixed decoders form not handling request errors properly |
| [#195](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/195) | Fixed float numbers ending in .0 in the Decoders yaml editor being transformed into integers |
| [#246](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/246) | Fixed detector details failing to load right after detector creation |
| [#321](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/321) | Fixed integration documentation field being truncated in the details view |
| [#462](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/462) | Fixed policy update errors failing silently instead of showing an error toast |
| [#398](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/398) | Fixed duplicate submissions by adding a loading state to create, edit and delete buttons |
| [#401](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/401) | Fixed inconsistent error handling in operations with integrations, filters, decoders, kvdbs, detectors, rules and promotion to show the server error message |
| [#458](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/458) | Fixed the Create rule action in the Integration details Actions menu redirecting to a nonexistent app |
| [#463](https://github.com/wazuh/wazuh-dashboard-security-analytics/issues/463) | Fixed promote and policy retrieval/clear errors failing silently instead of showing an error toast |

## Prior versions

