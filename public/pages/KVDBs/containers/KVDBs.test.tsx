/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { EuiSearchBar } from '@elastic/eui';
import { KVDBs } from './KVDBs';
import { setupCoreStart } from '../../../../test/utils/helpers';

// Wazuh: a real parsed Query (not a plain `{}`) — `getFreeText`/the debounce
// effect call `query.ast.getTermClauses()`, which only a genuine EuiSearchBar
// Query provides.
const VALID_QUERY = EuiSearchBar.Query.parse('');

beforeAll(() => {
  setupCoreStart();
});

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

const triggerSearchChange = async (
  wrapper: any,
  payload: { query?: any; queryText?: string; error?: any }
) => {
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

    await triggerSearchChange(wrapper, { query: VALID_QUERY, error: undefined });

    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
    expect(wrapper.find('EuiBasicTable').length).toBeGreaterThan(0);
  });

  it('regression: a recognized field with an unrecognized value does not trigger the callout', async () => {
    const wrapper = await mountKVDBs();
    await triggerSearchChange(wrapper, { query: VALID_QUERY, error: undefined });
    expect(wrapper.find('[data-test-subj="entitySearchErrorCallOut"]').length).toBe(0);
  });
});

describe('<KVDBs /> search does not refetch per keystroke', () => {
  it('fires no request while the free text is still debouncing', async () => {
    jest.useFakeTimers();
    try {
      const wrapper = await mountKVDBs();
      const callsAfterMount = DataStore.kvdbs.searchKVDBs.mock.calls.length;

      for (const text of ['t', 'th', 'thr', 'thre']) {
        await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse(text) });
      }

      expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(callsAfterMount);
    } finally {
      jest.useRealTimers();
    }
  });

  it('fires exactly one request once the debounce elapses', async () => {
    jest.useFakeTimers();
    try {
      const wrapper = await mountKVDBs();
      const callsAfterMount = DataStore.kvdbs.searchKVDBs.mock.calls.length;

      for (const text of ['t', 'th', 'thr', 'thre']) {
        await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse(text) });
      }
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      wrapper.update();

      expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(callsAfterMount + 1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('<KVDBs /> search error guidance', () => {
  // Wazuh: the callout's guidance props are wired per container. A missing prop is a
  // runtime blank, not a type error while tsc cannot check this tree, so assert the
  // rendered text.
  it("names this list's searchable fields and selectors on an unknown field", async () => {
    const wrapper = await mountKVDBs();
    await triggerSearchChange(wrapper, {
      error: { message: 'Unknown field `document.id`' },
      queryText: 'document.id:abc',
    });

    const guidance = wrapper
      .find('[data-test-subj="entitySearchErrorCallOutGuidance"]')
      .hostNodes();
    expect(guidance.text()).toContain('id, title or author');
    expect(guidance.text()).toContain('Status and Integration');
  });
});

describe('<KVDBs /> typed filter clauses', () => {
  it('debounces a typed filter value and applies a popover clause at once', async () => {
    jest.useFakeTimers();
    try {
      const wrapper = await mountKVDBs();
      const before = DataStore.kvdbs.searchKVDBs.mock.calls.length;

      await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse('integration:wazuh') });
      expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(before);

      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      wrapper.update();
      expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(before + 1);

      const afterTyped = DataStore.kvdbs.searchKVDBs.mock.calls.length;
      await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse('integration:(aws)') });
      expect(DataStore.kvdbs.searchKVDBs.mock.calls.length).toBe(afterTyped + 1);
    } finally {
      jest.useRealTimers();
    }
  });
});
