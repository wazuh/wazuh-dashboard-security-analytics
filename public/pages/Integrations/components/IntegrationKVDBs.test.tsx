/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationKVDBs } from './IntegrationKVDBs';
import { SpaceTypes } from '../../../../common/constants';

const mockUseIntegrationKVDBs = jest.fn((_params: unknown) => ({
  items: [{ id: 'kvdb-1', document: { metadata: { title: 'One', author: 'Wazuh' } } }],
  total: 1,
  loading: false,
}));

jest.mock('../../KVDBs/hooks/useIntegrationKVDBs', () => ({
  useIntegrationKVDBs: (params: unknown) => mockUseIntegrationKVDBs(params),
}));

const mockUseEntityStatusCounts = jest.fn((..._args: unknown[]) => ({
  counts: { enabled: 1, disabled: 2 },
  loading: false,
  reload: jest.fn(),
}));

jest.mock('../../../hooks/useEntityStatusCounts', () => ({
  useEntityStatusCounts: (...args: unknown[]) => mockUseEntityStatusCounts(...args),
}));

const buildHistory = () => ({ push: jest.fn() } as any);

// Wazuh: the Integration details view hands the table its own path, on its own tab.
const RETURN_TO = '/integrations/wazuh-core?space=draft&tab=kvdbs';

// The cross-app link to the create form, carrying this integration.
const CREATE_HREF = 'kvdbs#/create-kvdb?integration=Wazuh%20core';

const mountTable = async (space: string, history: any) => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <IntegrationKVDBs
        kvdbIds={['kvdb-1']}
        space={space}
        enabled
        history={history}
        returnTo={RETURN_TO}
        createHref={CREATE_HREF}
        reloadTrigger={0}
        onRefresh={jest.fn()}
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const getEditButton = (wrapper: any) =>
  wrapper.find(`button[data-test-subj="integration-kvdbs-edit"]`).first();

const getEditTooltip = (wrapper: any) =>
  wrapper.find('IntegrationEditAction').first().find('EuiToolTip').first().prop('content');

describe('<IntegrationKVDBs /> edit action', () => {
  it('navigates to the KVDB edit page in the draft space', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, history);
    const editButton = getEditButton(wrapper);

    expect(editButton.prop('disabled')).toBe(false);
    expect(getEditTooltip(wrapper)).toBe('Edit KVDB');

    editButton.simulate('click');
    expect(history.push).toHaveBeenCalledWith(
      `/edit-kvdb/kvdb-1?returnTo=${encodeURIComponent(RETURN_TO)}`
    );
  });

  it('stays visible but disabled outside the draft space, saying where editing is allowed', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.STANDARD.value, history);

    expect(getEditButton(wrapper).prop('disabled')).toBe(true);
    expect(getEditTooltip(wrapper)).toBe('KVDBs can only be edited in the spaces: draft');

    expect(history.push).not.toHaveBeenCalled();
  });
});

describe('<IntegrationKVDBs /> status summary', () => {
  it('shows the total and the status split of every KVDB of the integration', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const summary = wrapper.find(`[data-test-subj="integrationKvdbsStatusSummary"]`).first();

    expect(summary.text()).toContain('1 result');
    expect(summary.text()).toContain('1 enabled');
    expect(summary.text()).toContain('2 disabled');
  });

  it('filters the table by the clicked status, and clears it on a second click', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const clickDisabled = async () => {
      await act(async () => {
        wrapper
          .find(`button[data-test-subj="integrationKvdbsStatusSummary-legend-disabled"]`)
          .first()
          .simulate('click');
      });
      wrapper.update();
    };

    await clickDisabled();
    expect(mockUseIntegrationKVDBs).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'disabled' })
    );

    await clickDisabled();
    expect(mockUseIntegrationKVDBs).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined })
    );
  });
});

describe('<IntegrationKVDBs /> status summary scope and errors', () => {
  it('counts every item of the integration in its space', async () => {
    await mountTable(SpaceTypes.DRAFT.value, buildHistory());

    expect(mockUseEntityStatusCounts).toHaveBeenLastCalledWith(
      'kvdbs',
      { space: SpaceTypes.DRAFT.value, ids: ['kvdb-1'] },
      expect.objectContaining({ enabled: true, reloadTrigger: 0 })
    );
  });

  it('shows no total when the list request failed', async () => {
    const listResult = mockUseIntegrationKVDBs.getMockImplementation()!({});
    mockUseIntegrationKVDBs.mockImplementation(
      () => ({ ...listResult, total: 0, error: true } as any)
    );
    try {
      const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());

      expect(wrapper.find(`[data-test-subj="integrationKvdbsStatusSummary-total"]`).exists()).toBe(
        false
      );
    } finally {
      mockUseIntegrationKVDBs.mockImplementation(() => listResult);
    }
  });
});
