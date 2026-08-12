/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { KVDBs } from './KVDBs';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    kvdbs: {
      searchKVDBs: jest.fn().mockResolvedValue({ items: [{ id: '1' }], total: 1 }),
      deleteKVDB: jest.fn(),
    },
    integrations: {
      listIntegrationOptions: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const notifications: any = {
  toasts: {
    addDanger: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
  },
};

const buildHistory = () =>
  ({
    push: jest.fn(),
    replace: jest.fn(),
    listen: jest.fn(),
    location: { pathname: '/kvdbs', search: '' },
  } as any);

const mountKVDBs = async () => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(<KVDBs history={buildHistory() as any} notifications={notifications} />);
  });
  wrapper.update();
  return wrapper;
};

const triggerSearchChange = async (wrapper: any, payload: { query?: any; error?: any }) => {
  await act(async () => {
    wrapper.find('EuiSearchBar').first().prop('onChange')(payload);
  });
  wrapper.update();
};

describe('<KVDBs /> search bar strict schema', () => {
  it('declares the shared ENTITY_SEARCH_SCHEMA on box.schema (status/integration only, no KVDBs-specific fields; EuiSearchBar has no top-level schema prop)', async () => {
    const wrapper = await mountKVDBs();
    const searchBar = wrapper.find('EuiSearchBar').first();
    expect(searchBar.prop('box')).toMatchObject({
      schema: {
        strict: true,
        fields: { status: { type: 'string' }, integration: { type: 'string' } },
      },
    });
    expect(searchBar.prop('schema')).toBeUndefined();
  });

  it('renders a warning callout above the table (table stays visible) on an unrecognized field', async () => {
    const wrapper = await mountKVDBs();
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('does not lose the previously loaded KVDBs while a parse error is shown', async () => {
    const wrapper = await mountKVDBs();
    const callsBefore = DataStore.kvdbs.searchKVDBs.mock.calls.length;

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(callsBefore);
  });

  it('clears the callout once a valid query is applied again', async () => {
    const wrapper = await mountKVDBs();
    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { query: {}, error: undefined });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('regression: a recognized field with an unrecognized value does not trigger the callout', async () => {
    const wrapper = await mountKVDBs();
    await triggerSearchChange(wrapper, { query: {}, error: undefined });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
  });
});
