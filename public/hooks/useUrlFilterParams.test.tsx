/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { useUrlFilterParams, UrlFilterConfig, UrlFilterState } from './useUrlFilterParams';

// Wazuh: a hand-rolled fake `history` (the same shape as RouteComponentProps['history']
// every container in this codebase already receives as a prop). We pass it via
// useUrlFilterParams's `historyOverride` param instead of wrapping in <MemoryRouter> +
// relying on useLocation()/useHistory(), because those hooks are implemented via
// React.useContext internally, and test/setup.jest.ts globally mocks `useContext`
// for the unrelated SecurityAnalyticsContext pattern — which breaks react-router's
// hooks (but not plain prop-drilling) in every test in this suite.
const createFakeHistory = (search: string) => {
  let location = { pathname: '/rules', search, hash: '', state: undefined as any };
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

// Wazuh: tiny harness exposing the hook's returned state via a ref, since this repo
// has no @testing-library/react-hooks dependency.
const Harness = ({
  config,
  history,
  stateRef,
}: {
  config: UrlFilterConfig;
  history: ReturnType<typeof createFakeHistory>;
  stateRef: { current: UrlFilterState | null };
}) => {
  const state = useUrlFilterParams(config, history as any);
  stateRef.current = state;
  return null;
};

const setup = (config: UrlFilterConfig, search: string) => {
  const history = createFakeHistory(search);
  const stateRef: { current: UrlFilterState | null } = { current: null };
  render(<Harness config={config} history={history} stateRef={stateRef} />);
  return { stateRef, history };
};

describe('useUrlFilterParams', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores values and page from the URL on mount', () => {
    const { stateRef } = setup(
      { params: ['query', 'status', 'integration', 'page'] },
      '?query=aws&status=enabled&integration=aws&page=3&space=standard'
    );

    expect(stateRef.current?.values).toEqual({ query: 'aws', status: 'enabled', integration: 'aws' });
    expect(stateRef.current?.page).toBe(3);
  });

  it('writes only the patched key and preserves siblings after debounce', () => {
    const { stateRef } = setup({ params: ['query', 'status', 'page'] }, '?status=enabled&space=standard');

    act(() => {
      stateRef.current?.setParams({ query: 'aws' });
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(stateRef.current?.values.query).toBe('aws');
    expect(stateRef.current?.values.status).toBe('enabled');
  });

  it('reflects a debounced param change in local state immediately, before the URL write fires', () => {
    const { stateRef } = setup({ params: ['query'] }, '');

    act(() => {
      stateRef.current?.setParams({ query: 'a' });
    });
    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(stateRef.current?.values.query).toBe('a');
  });

  it('resets page to 1 when a resetPageOn param changes', () => {
    const { stateRef } = setup({ params: ['query', 'status', 'page'] }, '?page=3');

    act(() => {
      stateRef.current?.setParams({ status: 'enabled' });
    });

    expect(stateRef.current?.page).toBe(1);
  });

  it('does not apply the page param for tables that opt out of it', () => {
    const { stateRef } = setup({ params: ['query', 'status'] }, '?page=5');

    expect(stateRef.current?.page).toBe(1);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    act(() => {
      stateRef.current?.setPage(2);
    });
    expect(stateRef.current?.page).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('clamps a non-numeric page to 1', () => {
    const { stateRef } = setup({ params: ['page'] }, '?page=not-a-number');

    expect(stateRef.current?.page).toBe(1);
  });

  it('clears a param via clearParam', () => {
    const { stateRef } = setup({ params: ['status'] }, '?status=enabled');

    act(() => {
      stateRef.current?.clearParam('status');
    });

    expect(stateRef.current?.values.status).toBe('');
  });
});
