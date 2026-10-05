/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectorHit } from '../../../../server/models/interfaces';
import { Detector, FieldMappingsTableItem, RuleItemInfoBase } from '../../../../types';
import { validateName } from '../../../utils/validation';
import { MIN_NUM_DATA_SOURCES } from './constants';

/* Wazuh: Add hasEnabledRules function */
export function hasEnabledRules(detector: Detector): boolean {
  const { detector_input } = detector.inputs[0];
  return detector_input.pre_packaged_rules.length + detector_input.custom_rules.length > 0;
}
/* End Wazuh */

/* Wazuh: Add isDetectorFormValid function */
export function isDetectorFormValid(detector: Detector): boolean {
  return (
    validateName(detector.name) &&
    detector.inputs[0].detector_input.indices.length >= MIN_NUM_DATA_SOURCES &&
    !!detector.detector_type &&
    hasEnabledRules(detector)
  );
}
/* End Wazuh */

/* Wazuh: integrations with the same name can coexist in the standard and
 * custom spaces, and rules are fetched by category (integration name), so the
 * result mixes both spaces. Detectors do not persist their space, but their
 * enabled rules carry it: infer the space from any enabled rule and keep only
 * the rules of that space. Without a matching rule the list is returned as is.
 */
export function filterRulesByDetectorSpace(
  allRules: RuleItemInfoBase[],
  detector: Detector
): RuleItemInfoBase[] {
  const enabledRuleIds = new Set([
    ...detector.inputs[0].detector_input.pre_packaged_rules.map((rule) => rule.id),
    ...detector.inputs[0].detector_input.custom_rules.map((rule) => rule.id),
  ]);
  const enabledRule = allRules.find((rule) => enabledRuleIds.has(rule._id));
  return enabledRule?.space
    ? allRules.filter((rule) => rule.space === enabledRule.space)
    : allRules;
}
/* End Wazuh */

export function getDetectorIds(detectors: DetectorHit[]) {
  return detectors.map((detector) => detector._id).join(', ');
}

export function getDetectorNames(detectors: DetectorHit[]) {
  return detectors.map((detector) => detector._source.name).join(', ');
}

export const getMappingFields = (
  properties: any,
  items: FieldMappingsTableItem[] = [],
  prefix: string = ''
): FieldMappingsTableItem[] => {
  for (let field in properties) {
    const fullFieldName = prefix ? `${prefix}.${field}` : field;
    const nextProperties = properties[field].properties;
    if (!nextProperties) {
      items.push({
        ruleFieldName: fullFieldName,
        logFieldName: properties[field].path,
      });
    } else {
      getMappingFields(nextProperties, items, fullFieldName);
    }
  }
  return items;
};
