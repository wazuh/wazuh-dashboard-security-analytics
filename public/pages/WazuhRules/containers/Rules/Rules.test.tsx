/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { EuiSearchBar } from '@elastic/eui';
import { Rules } from './Rules';
import { setupCoreStart } from '../../../../../test/utils/helpers';

// Wazuh: a real parsed Query (not a plain `{}`) — `getFreeText`/the debounce
// effect call `query.ast.getTermClauses()`, which only a genuine EuiSearchBar
// Query provides.
const VALID_QUERY = EuiSearchBar.Query.parse('');

beforeAll(() => {
  setupCoreStart();
});

// Wazuh: this suite's global `useContext` mock (see test/setup.jest.ts) makes
// react-router's raw `useHistory()`/`useLocation()` resolve incorrectly — see
// the identical note in useUrlFilterParams.ts. `useUrlParamItem` (used here
// only for the rule-details flyout's `ruleId` URL param) calls `useHistory()`
// directly, so it's mocked out; it isn't what these search-bar tests exercise.
jest.mock('../../../../hooks/useUrlParamItem', () => ({
  useUrlParamItem: () => ({ paramId: null, setParam: jest.fn(), clearParam: jest.fn() }),
}));

jest.mock('../../../../store/DataStore', () => ({
  DataStore: {
    rules: {
      searchRules: jest.fn().mockResolvedValue({
        items: [{ _id: '1', _source: { enabled: true, level: 'medium' } }],
        total: 1,
      }),
      deleteRule: jest.fn(),
    },
    integrations: {
      listIntegrationOptions: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { DataStore } = jest.requireMock('../../../../store/DataStore');

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
    location: { pathname: '/rules', search: '' },
  } as any);

const mountRules = async () => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(<Rules history={buildHistory()} notifications={notifications} />);
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

describe('<Rules /> search bar strict schema', () => {
  it('declares ENTITY_SEARCH_SCHEMA on box.schema (status/integration only; EuiSearchBar has no top-level schema prop)', async () => {
    const wrapper = await mountRules();
    const searchBar = wrapper.find('EuiSearchBar').first();
    expect(searchBar.prop('box')).toMatchObject({
      schema: {
        strict: true,
        fields: { status: { type: 'string' }, integration: { type: 'string' } },
      },
    });
    expect(searchBar.prop('schema')).toBeUndefined();
  });

  it('renders a warning callout above the table (table stays visible) on an unrecognized field, including invented fields like level/category', async () => {
    const wrapper = await mountRules();
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('does not lose the previously loaded rules while a parse error is shown', async () => {
    const wrapper = await mountRules();
    const callsBefore = DataStore.rules.searchRules.mock.calls.length;

    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });

    expect(DataStore.rules.searchRules.mock.calls.length).toBe(callsBefore);
  });

  it('clears the callout once a valid query is applied again', async () => {
    const wrapper = await mountRules();
    await triggerSearchChange(wrapper, { error: { message: 'Unable to parse query' } });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBeGreaterThan(0);

    await triggerSearchChange(wrapper, { query: VALID_QUERY, error: undefined });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('regression: a recognized field with an unrecognized value does not trigger the callout', async () => {
    const wrapper = await mountRules();
    await triggerSearchChange(wrapper, { query: VALID_QUERY, error: undefined });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
  });
});
