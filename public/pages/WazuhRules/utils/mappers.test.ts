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
