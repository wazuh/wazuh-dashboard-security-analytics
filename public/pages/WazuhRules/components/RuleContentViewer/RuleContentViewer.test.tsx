/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RuleItemInfoBase } from '../../../../../types';
import { RuleContentViewer, formatRuleDate } from './RuleContentViewer';

const LONG_URL = `https://example.com/${'very-long-path/'.repeat(20)}`;

const buildRule = (overrides: Record<string, any> = {}): RuleItemInfoBase =>
  ({
    _id: 'rule-id-1',
    _index: '',
    _primary_term: 1,
    _version: 1,
    prePackaged: false,
    space: 'draft',
    integration: { document: { metadata: { title: 'Windows' } } },
    _source: {
      id: 'rule-id-1',
      level: 'high',
      status: 'experimental',
      enabled: true,
      tags: [{ value: 'attack.t1078' }],
      false_positives: [],
      detection: 'selection:\n  a: b\ncondition: selection\n',
      mitre: 'technique:\n  id: [T1078]\n  name: [Valid Accounts]\n',
      compliance: '',
      metadata: {
        title: 'Suspicious login',
        description: 'Detects a suspicious login.',
        author: 'Wazuh',
        date: '2026-07-28',
        modified: '2026-07-29',
        documentation: '',
        supports: [],
        references: [LONG_URL],
      },
      ...overrides,
    },
  } as any);

const expectSection = (id: string, title: string, expanded: boolean) => {
  const button = screen.getByTestId(`rule_flyout_section_${id}`).querySelector('button')!;
  expect(button.querySelector('h3')?.textContent).toBe(title);
  expect(button.getAttribute('aria-expanded')).toBe(String(expanded));
};

describe('<RuleContentViewer />', () => {
  it('shows the status row and an overview without repeating the title', () => {
    render(<RuleContentViewer rule={buildRule()} />);

    expect(screen.getByTestId('rule_flyout_enabled').textContent).toContain('Enabled');
    expect(screen.getByTestId('rule_flyout_rule_level').textContent).toBe('High');
    expect(screen.getByTestId('rule_flyout_rule_status').textContent).toBe(
      'Rule status: experimental'
    );
    expect(screen.getByTestId('rule_flyout_space').textContent).toBe('Space: draft');
    expect(screen.getByTestId('rule_flyout_rule_description').textContent).toBe(
      'Detects a suspicious login.'
    );
    expect(screen.queryByText('Suspicious login')).toBeNull();

    const overview = within(screen.getByTestId('rule_flyout_rule_overview'));
    expect(overview.getByText('Windows')).toBeTruthy();
    expect(overview.getByText('Jul 28, 2026')).toBeTruthy();
    expect(overview.getByText('Jul 29, 2026')).toBeTruthy();
    expect(overview.getByText('rule-id-1')).toBeTruthy();
    expect(overview.getByLabelText('Copy ID')).toBeTruthy();
    // Empty optional fields are hidden.
    expect(overview.queryByText('Documentation')).toBeNull();
    expect(overview.queryByText('Supports')).toBeNull();
  });

  it('renders collapsible sections with counts and the expected default state', () => {
    render(<RuleContentViewer rule={buildRule()} />);

    expectSection('detection', 'Detection', true);
    expectSection('mitre', 'MITRE ATT&CK (1)', true);
    expectSection('tags', 'Tags (1)', false);
    expectSection('references', 'References (1)', false);
    // Empty sections are hidden.
    expect(screen.queryByTestId('rule_flyout_section_compliance')).toBeNull();
    expect(screen.queryByTestId('rule_flyout_section_false_positives')).toBeNull();
  });

  it('truncates long references and lists false positive cases', () => {
    render(
      <RuleContentViewer
        rule={buildRule({ false_positives: [{ value: 'Admin logins' }, { value: 'Backups' }] })}
      />
    );

    const link = within(screen.getByTestId('rule_flyout_rule_references')).getByRole('link');
    expect(link.getAttribute('href')).toBe(LONG_URL);
    expect(link.querySelector('.eui-textTruncate')?.textContent).toBe(LONG_URL);
    expectSection('false_positives', 'False positive cases (2)', false);
    expect(
      screen.getByTestId('rule_flyout_rule_false_positives').querySelectorAll('li').length
    ).toBe(2);
  });

  it('keeps the YAML and JSON views', () => {
    const { container } = render(<RuleContentViewer rule={buildRule()} />);

    fireEvent.click(screen.getByTestId('yaml'));
    expect(screen.getByTestId('rule_flyout_yaml_rule')).toBeTruthy();
    fireEvent.click(screen.getByTestId('json'));
    expect(container.querySelector('code')?.textContent).toContain('"level": "high"');
  });
});

describe('formatRuleDate', () => {
  it('formats date-only values without a time', () => {
    expect(formatRuleDate('2026-07-28')).toBe('Jul 28, 2026');
  });

  it('leaves empty values empty', () => {
    expect(formatRuleDate(undefined)).toBeUndefined();
    expect(formatRuleDate('')).toBe('');
  });
});
