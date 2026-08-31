/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationDetectionRules } from './IntegrationDetectionRules';
import { SpaceTypes } from '../../../../common/constants';

jest.mock('../../WazuhRules/hooks/useIntegrationRules', () => ({
  useIntegrationRules: () => ({
    items: [{ ruleId: 'rule-1', title: 'Rule 1', level: 'medium', description: '' }],
    total: 1,
    loading: false,
    refresh: jest.fn(),
  }),
}));

const buildHistory = () => ({ push: jest.fn() } as any);

// Wazuh: the Integration details view hands the table its own path, on its own tab.
const RETURN_TO = '/integrations/wazuh-core?space=draft&tab=detection_rules';

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
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const getEditAction = (wrapper: any) => {
  const columns = wrapper.find('EuiBasicTable').first().prop('columns') as any[];
  const actionsColumn = columns.find((column) => column.name === 'Actions');
  return actionsColumn?.actions?.find((action: any) => action.name === 'Edit');
};

describe('<IntegrationDetectionRules /> edit action', () => {
  it('navigates to the rule edit page in the draft space', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, history);
    const editAction = getEditAction(wrapper);

    expect(editAction.available()).toBe(true);

    editAction.onClick({ ruleId: 'rule-1' });
    expect(history.push).toHaveBeenCalledWith(
      `/edit-rule/rule-1?returnTo=${encodeURIComponent(RETURN_TO)}`
    );
  });

  it('is not available outside the draft space', async () => {
    const wrapper = await mountTable(SpaceTypes.STANDARD.value, buildHistory());

    expect(getEditAction(wrapper).available()).toBe(false);
  });
});
