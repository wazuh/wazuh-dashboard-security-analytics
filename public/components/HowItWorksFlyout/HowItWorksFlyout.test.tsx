/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { HowItWorksFlyout, HOW_IT_WORKS_TITLE, openHowItWorksFlyout } from './HowItWorksFlyout';
import { CTI_FEED_APP_ID, LOG_DATA_COLLECTION_DOCUMENTATION_URL } from '../../utils/constants';
import { getApplication } from '../../services/utils/constants';

jest.mock('../../services/utils/constants', () => ({
  getApplication: jest.fn(),
}));

const CTI_FEED_URL = '/app/cti_feed';

describe('HowItWorksFlyout', () => {
  beforeEach(() => {
    (getApplication as jest.Mock).mockReturnValue({
      navigateToApp: jest.fn(),
      getUrlForApp: jest.fn().mockReturnValue(CTI_FEED_URL),
    });
  });

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
    expect(screen.getByRole('link', { name: /How to collect a log/ }).getAttribute('href')).toBe(
      LOG_DATA_COLLECTION_DOCUMENTATION_URL
    );
  });

  it('says the standard space is synced from the CTI feed and opens the CTI feed app', () => {
    const navigateToApp = jest.fn();
    const getUrlForApp = jest.fn().mockReturnValue(CTI_FEED_URL);
    (getApplication as jest.Mock).mockReturnValue({ navigateToApp, getUrlForApp });
    render(<HowItWorksFlyout />);

    act(() => {
      openHowItWorksFlyout();
    });

    expect(screen.getByText(/checks the feed for updates every hour by default/)).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Open CTI feed' });
    expect(getUrlForApp).toHaveBeenCalledWith(CTI_FEED_APP_ID);
    expect(link.getAttribute('href')).toBe(CTI_FEED_URL);
    link.click();
    expect(navigateToApp).toHaveBeenCalledWith(CTI_FEED_APP_ID);
  });
});
