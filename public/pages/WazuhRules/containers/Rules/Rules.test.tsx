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

// Wazuh: a fake `history` whose `replace` notifies `listen` subscribers, so a
// same-route URL change reaches useUrlFilterParams. Mirrors useUrlFilterParams.test.
const createFakeHistory = (pathname: string, search: string) => {
  let location = { pathname, search, hash: '', state: undefined as any };
  const listeners: Array<(loc: typeof location) => void> = [];
  return {
    get location() {
      return location;
    },
    replace: jest.fn((next: { search: string }) => {
      location = { ...location, search: next.search };
      listeners.forEach((listener) => listener(location));
    }),
    push: jest.fn(),
    listen: jest.fn((listener: (loc: typeof location) => void) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }),
  };
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

const triggerSearchChange = async (
  wrapper: any,
  payload: { query?: any; queryText?: string; error?: any }
) => {
  await act(async () => {
    wrapper.find('EuiSearchBar').first().prop('onChange')(payload);
  });
  wrapper.update();
};

describe('<Rules /> search bar strict schema', () => {
  it('declares a strict schema on box.schema (status/integration/level; EuiSearchBar has no top-level schema prop)', async () => {
    const wrapper = await mountRules();
    const searchBar = wrapper.find('EuiSearchBar').first();
    expect(searchBar.prop('box')).toMatchObject({
      schema: {
        strict: true,
        fields: {
          status: { type: 'string' },
          integration: { type: 'string' },
          level: { type: 'string' },
        },
      },
    });
    expect(searchBar.prop('schema')).toBeUndefined();
  });

  it('renders a warning callout above the table (table stays visible) on an unrecognized field, including invented fields like author/category', async () => {
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

describe('<Rules /> search error guidance', () => {
  // Wazuh: the callout's guidance props are wired per container. A missing prop is a
  // runtime blank, not a type error while tsc cannot check this tree, so assert the
  // rendered text.
  it("names this list's searchable fields and selectors on an unknown field", async () => {
    const wrapper = await mountRules();
    await triggerSearchChange(wrapper, {
      error: { message: 'Unknown field `document.id`' },
      queryText: 'document.id:abc',
    });

    const guidance = wrapper
      .find('[data-test-subj="entitySearchErrorCallOutGuidance"]')
      .hostNodes();
    expect(guidance.text()).toContain('id, title, author, level or integration');
    expect(guidance.text()).toContain('Status, Integration and Rule level');
  });
});

describe('<Rules /> URL resync', () => {
  // Wazuh: the resync effect skips its first run, since the initializers already read
  // the URL. A same-route URL change (an Integration popover CTA while already on this
  // page) must still hydrate the search bar and refetch.
  it('hydrates the search bar and refetches on a same-route URL change', async () => {
    const history = createFakeHistory('/rules', '?space=standard');
    let wrapper: any;
    await act(async () => {
      wrapper = mount(<Rules history={history as any} notifications={notifications} />);
    });
    wrapper.update();
    const callsBefore = DataStore.rules.searchRules.mock.calls.length;

    await act(async () => {
      history.replace({ search: '?space=standard&integration=wazuh-core' });
    });
    wrapper.update();

    expect(wrapper.find('EuiSearchBar').first().prop('query').text).toContain(
      'integration:(wazuh-core)'
    );
    expect(DataStore.rules.searchRules.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(JSON.stringify(DataStore.rules.searchRules.mock.calls.at(-1)[0])).toContain(
      'wazuh-core'
    );
  });
});

describe('<Rules /> typed filter clauses', () => {
  it('debounces a typed filter value and applies a popover clause at once', async () => {
    jest.useFakeTimers();
    try {
      const wrapper = await mountRules();
      const before = DataStore.rules.searchRules.mock.calls.length;

      await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse('integration:wazuh') });
      expect(DataStore.rules.searchRules.mock.calls.length).toBe(before);

      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      wrapper.update();
      expect(DataStore.rules.searchRules.mock.calls.length).toBe(before + 1);

      const afterTyped = DataStore.rules.searchRules.mock.calls.length;
      await triggerSearchChange(wrapper, { query: EuiSearchBar.Query.parse('integration:(aws)') });
      expect(DataStore.rules.searchRules.mock.calls.length).toBe(afterTyped + 1);
    } finally {
      jest.useRealTimers();
    }
  });
});
