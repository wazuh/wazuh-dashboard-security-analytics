# Change Log

All notable changes to the Wazuh ML Commons project will be documented in this file.

## Wazuh dashboard v5.0.0 - OpenSearch Dashboards 3.3.0 - Revision 00

### Added

- Support for Wazuh 5.0.0

### Changed

- Renamed Log types to Integrations [#11](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/11)
- Restructured Security Analytics main menu navigation [#11](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/11) [#14](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/14) [#18](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/18)
- Hide Alerts/Correlations and Correlation rules from the Security Analytics navigation, leaving Findings at the root level [#8004](https://github.com/wazuh/wazuh-dashboard-plugins/pull/8004)

### Removed

- Removed Threat Intelligence section entirely [#11](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/11) [#20](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/20)

### Fixed

- Fixed YAML Editor when creating or editing detection rules [#9](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/9)
- Fixed flyout data inconsistencies, overview sub-menu navigation issues, and removed the Decoder section subtitle [#30](https://github.com/wazuh/wazuh-dashboard-security-analytics/pull/30)