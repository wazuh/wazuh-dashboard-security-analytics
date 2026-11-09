/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { load } from 'js-yaml';
import { mapRuleToYamlObject, mapYamlObjectToRule } from './mappers';
import { Rule } from '../../../../types';

describe('mapYamlObjectToRule', () => {
  it('leaves nested-metadata rule output unchanged from today', () => {
    const nestedRule = {
      id: 'rule-id',
      level: 'high',
      status: 'stable',
      detection: { condition: 'selection' },
      metadata: {
        title: 'Nested title',
        author: 'Nested author',
        description: 'Nested description',
        references: ['https://example.com'],
      },
    };

    const result = mapYamlObjectToRule(nestedRule);

    expect(result.metadata).toEqual({
      title: 'Nested title',
      author: 'Nested author',
      description: 'Nested description',
      references: ['https://example.com'],
      documentation: undefined,
      supports: [],
    });
  });
});

describe('mapRuleToYamlObject', () => {
  const baseRule: Rule = {
    id: 'rule-id',
    category: 'linux',
    log_source: {},
    tags: [],
    false_positives: [],
    level: 'high',
    status: 'stable',
    enabled: true,
    detection: '',
    metadata: {
      title: 'Title',
      author: 'Author',
      description: 'Description',
      references: [],
      documentation: '',
      supports: [],
    },
    mitre: '',
    compliance: '',
  } as unknown as Rule;

  it('preserves every metadata key across a nested-in nested-out round trip', () => {
    const nestedRule = {
      level: 'high',
      status: 'stable',
      detection: { condition: 'selection' },
      metadata: {
        title: 'Nested title',
        description: 'Nested description',
        author: 'Nested author',
        references: ['https://example.com'],
      },
    };

    const rule = mapYamlObjectToRule(nestedRule);
    const yamlObject = mapRuleToYamlObject(rule);

    expect(yamlObject.metadata).toMatchObject({
      title: 'Nested title',
      description: 'Nested description',
      author: 'Nested author',
      references: ['https://example.com'],
    });
  });
});

describe('sigma_id and logsource', () => {
  const yamlRule = {
    sigma_id: '19aefed0-ffd4-47dc-a7fc-f8b1425e84f9',
    level: 'medium',
    status: 'stable',
    logsource: { product: 'test-integration', category: 'application', service: 'python' },
    detection: { keywords: ['DataError'], condition: 'keywords' },
    metadata: { title: 'Python SQL Exceptions' },
  };

  it('keeps sigma_id and every logsource field when reading YAML', () => {
    const rule = mapYamlObjectToRule(yamlRule);

    expect(rule.sigma_id).toBe('19aefed0-ffd4-47dc-a7fc-f8b1425e84f9');
    expect(rule.category).toBe('test-integration');
    expect(rule.log_source).toEqual({
      product: 'test-integration',
      category: 'application',
      service: 'python',
    });
  });

  it('ignores a logsource that is not a mapping', () => {
    const rule = mapYamlObjectToRule({ ...yamlRule, logsource: 'test-integration' });

    expect(rule.log_source).toEqual({});
    expect(rule.category).toBeUndefined();
  });

  it('writes sigma_id and the full logsource back to YAML', () => {
    const yamlObject = mapRuleToYamlObject(mapYamlObjectToRule(yamlRule));

    expect(yamlObject.sigma_id).toBe('19aefed0-ffd4-47dc-a7fc-f8b1425e84f9');
    expect(yamlObject.logsource).toEqual(yamlRule.logsource);
  });

  it('shows logsource.product, not the display category, as the product', () => {
    // The store fills `category` with logsource.category when the rule has one.
    const rule = {
      ...mapYamlObjectToRule(yamlRule),
      category: 'application',
    };

    expect(mapRuleToYamlObject(rule).logsource.product).toBe('test-integration');
  });

  it('leaves sigma_id out of the YAML when the rule has none', () => {
    const { sigma_id: _sigmaId, ...withoutSigmaId } = yamlRule;

    expect(mapRuleToYamlObject(mapYamlObjectToRule(withoutSigmaId))).not.toHaveProperty('sigma_id');
  });
});
