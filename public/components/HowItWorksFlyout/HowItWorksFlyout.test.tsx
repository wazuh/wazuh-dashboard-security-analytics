/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { HowItWorksFlyout, HOW_IT_WORKS_TITLE, openHowItWorksFlyout } from './HowItWorksFlyout';
import { LOG_DATA_COLLECTION_DOCUMENTATION_URL } from '../../utils/constants';

describe('HowItWorksFlyout', () => {
  it('renders nothing until it is opened', () => {
    render(<HowItWorksFlyout />);

    expect(screen.queryByText(HOW_IT_WORKS_TITLE)).toBeNull();
  });

  it('opens with the collect-the-log step and its documentation link', () => {
    render(<HowItWorksFlyout />);

    act(() => {
      openHowItWorksFlyout();
    });

    expect(screen.getByText(HOW_IT_WORKS_TITLE)).toBeTruthy();
    expect(screen.getByText('First step: collect the log')).toBeTruthy();
    expect(screen.getByText('How to collect a log').closest('a')?.getAttribute('href')).toBe(
      LOG_DATA_COLLECTION_DOCUMENTATION_URL
    );
  });
});
