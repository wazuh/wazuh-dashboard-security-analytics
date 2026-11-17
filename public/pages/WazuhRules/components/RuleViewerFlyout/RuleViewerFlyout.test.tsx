/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleViewerFlyout } from './RuleViewerFlyout';

const ruleTableItem: any = {
  title: 'Suspicious login',
  ruleInfo: {
    _id: 'rule-id-1',
    _source: {
      id: 'rule-id-1',
      level: 'high',
      tags: [],
      false_positives: [],
      detection: '',
      metadata: { title: 'Suspicious login' },
    },
  },
};

describe('<RuleViewerFlyout />', () => {
  it('uses the rule title as the heading, without the "Rule details - " prefix', () => {
    render(<RuleViewerFlyout ruleTableItem={ruleTableItem} hideFlyout={jest.fn()} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Suspicious login');
    expect(screen.getByText('Rule details')).toBeTruthy();
    expect(screen.getByTestId('rule_flyout_Suspicious login')).toBeTruthy();
  });
});
