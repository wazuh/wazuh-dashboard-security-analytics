/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Rule } from '../../../../../types';
import { mapFormToRule, mapRuleToForm } from './mappers';
import { ruleEditorStateDefaultValue } from './RuleEditorFormModel';

describe('RuleEditor mappers', () => {
  const storedRule = {
    id: 'rule-id',
    sigma_id: '85254a62-22be-4239-b79c-2ec17e566c37',
    // The store fills `category` with logsource.category when the rule has one.
    category: 'webserver',
    log_source: { product: 'apache-http', category: 'webserver' },
    tags: [],
    false_positives: [],
    level: 'high',
    status: 'stable',
    enabled: true,
    detection: 'condition: selection\n',
    mitre: '',
    compliance: '',
    metadata: { title: 'Title', author: 'Author', description: '', references: [] },
  } as unknown as Rule;

  it('takes the integration from logsource.product, not the display category', () => {
    expect(mapRuleToForm(storedRule).integration).toBe('apache-http');
  });

  it('keeps sigma_id and the full logsource across a form round trip', () => {
    const rule = mapFormToRule(mapRuleToForm(storedRule));

    expect(rule.sigma_id).toBe('85254a62-22be-4239-b79c-2ec17e566c37');
    expect(rule.log_source).toEqual({ product: 'apache-http', category: 'webserver' });
  });

  it('sets logsource.product to the selected integration', () => {
    const rule = mapFormToRule({
      ...ruleEditorStateDefaultValue,
      integration: 'new-integration',
      log_source: { product: 'old-integration', category: 'application' },
    });

    expect(rule.log_source).toEqual({ product: 'new-integration', category: 'application' });
  });
});
