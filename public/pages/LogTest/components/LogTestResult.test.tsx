/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LogTestResult } from './LogTestResult';
import { LogTestResponse } from '../../../../types';

const resultWithMatch = (level: string): LogTestResponse => ({
  status: 'OK',
  message: {
    normalization: { status: 'success', output: {} },
    detection: {
      status: 'success',
      rules_evaluated: 1,
      rules_matched: 1,
      matches: [
        {
          rule: { id: 'rule-1', title: 'Apache Failure Detection', level, tags: [] },
          matched_conditions: [],
        },
      ],
    },
  },
});

describe('<LogTestResult /> rule level', () => {
  it.each([
    ['medium', 'Medium'],
    ['informational', 'Informational'],
  ])('shows the %s level as %s, like the rule form', (level, label) => {
    render(<LogTestResult result={resultWithMatch(level)} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Detection' }));

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(level)).not.toBeInTheDocument();
  });

  it('shows a level it does not know as it came', () => {
    render(<LogTestResult result={resultWithMatch('unknown')} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Detection' }));

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
