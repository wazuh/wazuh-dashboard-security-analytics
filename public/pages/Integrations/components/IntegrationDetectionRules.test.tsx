/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationDetectionRules } from './IntegrationDetectionRules';
import { SpaceTypes } from '../../../../common/constants';

const mockUseIntegrationRules = jest.fn((_params: unknown) => ({
  items: [{ ruleId: 'rule-1', title: 'Rule 1', level: 'medium', description: '' }],
  total: 1,
  loading: false,
}));

jest.mock('../../WazuhRules/hooks/useIntegrationRules', () => ({
  useIntegrationRules: (params: unknown) => mockUseIntegrationRules(params),
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
const RETURN_TO = '/integrations/wazuh-core?space=draft&tab=detection_rules';

// The cross-app link to the create form, carrying this integration.
const CREATE_HREF = 'rules#/create-rule?integration=Wazuh%20core';

const mountTable = async (space: string, history: any) => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <IntegrationDetectionRules
        ruleIds={['rule-1']}
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
  wrapper.find(`button[data-test-subj="integration-rules-edit"]`).first();

const getEditTooltip = (wrapper: any) =>
  wrapper.find('IntegrationEditAction').first().find('EuiToolTip').first().prop('content');

describe('<IntegrationDetectionRules /> edit action', () => {
  it('navigates to the rule edit page in the draft space', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, history);
    const editButton = getEditButton(wrapper);

    expect(editButton.prop('disabled')).toBe(false);
    expect(getEditTooltip(wrapper)).toBe('Edit rule');

    editButton.simulate('click');
    expect(history.push).toHaveBeenCalledWith(
      `/edit-rule/rule-1?returnTo=${encodeURIComponent(RETURN_TO)}`
    );
  });

  it('stays visible but disabled outside the draft space, saying where editing is allowed', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.STANDARD.value, history);

    expect(getEditButton(wrapper).prop('disabled')).toBe(true);
    expect(getEditTooltip(wrapper)).toBe('Rules can only be edited in the spaces: draft');

    expect(history.push).not.toHaveBeenCalled();
  });
});

describe('<IntegrationDetectionRules /> status summary', () => {
  it('shows the total and the status split of every rule of the integration', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const summary = wrapper.find(`[data-test-subj="integrationRulesStatusSummary"]`).first();

    expect(summary.text()).toContain('1 result');
    expect(summary.text()).toContain('1 enabled');
    expect(summary.text()).toContain('2 disabled');
  });

  it('filters the table by the clicked status, and clears it on a second click', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const clickDisabled = async () => {
      await act(async () => {
        wrapper
          .find(`button[data-test-subj="integrationRulesStatusSummary-legend-disabled"]`)
          .first()
          .simulate('click');
      });
      wrapper.update();
    };

    await clickDisabled();
    expect(mockUseIntegrationRules).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'disabled' })
    );

    await clickDisabled();
    expect(mockUseIntegrationRules).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined })
    );
  });
});

describe('<IntegrationDetectionRules /> status summary scope and errors', () => {
  it('counts every item of the integration in its space', async () => {
    await mountTable(SpaceTypes.DRAFT.value, buildHistory());

    expect(mockUseEntityStatusCounts).toHaveBeenLastCalledWith(
      'rules',
      { space: SpaceTypes.DRAFT.value, ids: ['rule-1'] },
      expect.objectContaining({ enabled: true, reloadTrigger: 0 })
    );
  });

  it('shows no total when the list request failed', async () => {
    const listResult = mockUseIntegrationRules.getMockImplementation()!({});
    mockUseIntegrationRules.mockImplementation(
      () => ({ ...listResult, total: 0, error: true } as any)
    );
    try {
      const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());

      expect(wrapper.find(`[data-test-subj="integrationRulesStatusSummary-total"]`).exists()).toBe(
        false
      );
    } finally {
      mockUseIntegrationRules.mockImplementation(() => listResult);
    }
  });
});
