/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { load } from 'js-yaml';
import { assertRuleShape, RuleShapeError } from './ruleShape';

describe('assertRuleShape', () => {
  it('accepts a rule with its descriptive fields under metadata', () => {
    const rule = {
      level: 'high',
      metadata: { title: 'Nested rule', author: 'qa' },
      detection: { condition: 'selection' },
    };

    expect(assertRuleShape(rule)).toBe(rule);
  });

  it('names the misplaced fields when they sit at the root', () => {
    // The shape a user types first, and what issue #487 reported as a confusing
    // "Rule name is required" pointing at a field that does not exist.
    const reported = [
      'title: Test rule',
      'status: stable',
      'author: qa',
      'description: Sigma style rule',
      'logsource:',
      '  product: iptables',
      'level: high',
      'detection:',
      '  condition: selection',
    ].join('\n');

    expect(() => assertRuleShape(load(reported))).toThrow(RuleShapeError);
    expect(() => assertRuleShape(load(reported))).toThrow(
      'These fields belong under metadata: title, author, description.'
    );
  });

  it('rejects a document that is not a mapping', () => {
    expect(() => assertRuleShape(load('- one\n- two\n'))).toThrow(
      'The rule must be a YAML mapping of rule fields.'
    );
    expect(() => assertRuleShape(null)).toThrow(RuleShapeError);
  });

  it('leaves rule-level fields at the root alone', () => {
    // level, status, tags and logsource genuinely live at the root.
    const rule = { level: 'high', status: 'stable', tags: [], logsource: { product: 'iptables' } };

    expect(() => assertRuleShape(rule)).not.toThrow();
  });
});
