/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PromoteBySpaceModal } from './PromoteModal';
import {
  CHANGES_APPLY_DELAY_TOAST_LIFE_TIME_MS,
  PROMOTED_TO_CUSTOM_NOTICE,
  PROMOTED_TO_TEST_NOTICE,
} from '../utils/constants';
import { ROUTES } from '../../../utils/constants';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    integrations: { promoteIntegration: jest.fn() },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const PROMOTE_RESPONSE = { promote: { changes: {} }, available_promotions: {} } as any;

const buildNotifications = () => ({ toasts: { addSuccess: jest.fn() } } as any);

const confirmPromotion = async (notifications: any, history: any, space = 'draft') => {
  render(
    <PromoteBySpaceModal
      promote={PROMOTE_RESPONSE}
      closeModal={jest.fn()}
      space={space as any}
      notifications={notifications}
      history={history}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'promote' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
  });
};

describe('<PromoteBySpaceModal /> promotion toast', () => {
  beforeEach(() => {
    DataStore.integrations.promoteIntegration.mockReset();
  });

  it.each([
    ['draft', 'Promoted draft to test', PROMOTED_TO_TEST_NOTICE],
    ['test', 'Promoted test to custom', PROMOTED_TO_CUSTOM_NOTICE],
  ])('names both spaces and what happens next once %s is promoted', async (space, title, text) => {
    DataStore.integrations.promoteIntegration.mockResolvedValue([true, undefined]);
    const notifications = buildNotifications();
    const history = { push: jest.fn() };

    await confirmPromotion(notifications, history, space);

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title,
      text,
      toastLifeTimeMs: CHANGES_APPLY_DELAY_TOAST_LIFE_TIME_MS,
    });
    expect(history.push).toHaveBeenCalledWith(ROUTES.INTEGRATIONS);
  });

  it('shows no success toast when the promotion fails', async () => {
    DataStore.integrations.promoteIntegration.mockResolvedValue([false, 'Promotion failed']);
    const notifications = buildNotifications();
    const history = { push: jest.fn() };

    await confirmPromotion(notifications, history);

    expect(DataStore.integrations.promoteIntegration).toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
    expect(history.push).not.toHaveBeenCalled();
  });
});
