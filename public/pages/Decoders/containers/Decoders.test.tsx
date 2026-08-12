/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { Decoders } from './Decoders';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    decoders: {
      searchDecoders: jest.fn().mockResolvedValue({ items: [{ id: '1' }], total: 1 }),
      deleteDecoder: jest.fn(),
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
    location: { pathname: '/decoders', search: '' },
  } as any);

const mountDecoders = async () => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(<Decoders history={buildHistory()} notifications={notifications} />);
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

describe('<Decoders /> search bar strict schema', () => {
  it('declares a strict schema on box and passes ENTITY_SEARCH_SCHEMA', async () => {
    const wrapper = await mountDecoders();
    const searchBar = wrapper.find('EuiSearchBar').first();
    expect(searchBar.prop('box')).toMatchObject({ schema: true });
    expect(searchBar.prop('schema')).toEqual({
      strict: true,
      fields: { status: { type: 'string' }, integration: { type: 'string' } },
    });
  });

  it('renders a warning callout above the table (table stays visible) when the search bar reports a parse error', async () => {
    const wrapper = await mountDecoders();
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('does not lose the previously loaded decoders while a parse error is shown', async () => {
    const wrapper = await mountDecoders();
    const callsBefore = DataStore.decoders.searchDecoders.mock.calls.length;

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(DataStore.decoders.searchDecoders.mock.calls.length).toBe(callsBefore);
  });

  it('clears the callout and re-renders the table once a valid query is applied again', async () => {
    const wrapper = await mountDecoders();
    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { query: {}, error: undefined });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('renders only the table (no callout) once a valid query is applied', async () => {
    const wrapper = await mountDecoders();
    await triggerSearchChange(wrapper, { query: {}, error: undefined });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('regression: a recognized field with an unrecognized value does not trigger the callout', async () => {
    const wrapper = await mountDecoders();
    await triggerSearchChange(wrapper, { query: {}, error: undefined });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
  });
});
