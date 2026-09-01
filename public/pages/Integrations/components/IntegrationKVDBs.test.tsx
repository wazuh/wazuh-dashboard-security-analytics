/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationKVDBs } from './IntegrationKVDBs';
import { SpaceTypes } from '../../../../common/constants';

jest.mock('../../KVDBs/hooks/useIntegrationKVDBs', () => ({
  useIntegrationKVDBs: () => ({
    items: [{ id: 'kvdb-1', document: { metadata: { title: 'One', author: 'Wazuh' } } }],
    total: 1,
    loading: false,
    refresh: jest.fn(),
  }),
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
