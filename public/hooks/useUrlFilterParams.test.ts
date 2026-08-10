/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlFilterParams, UrlFilterConfig, UrlFilterState } from './useUrlFilterParams';

// Wazuh: tiny harness exposing the hook's returned state via a ref, since this repo
// has no @testing-library/react-hooks dependency.
const Harness = ({
  config,
  stateRef,
}: {
  config: UrlFilterConfig;
  stateRef: { current: UrlFilterState | null };
}) => {
  const state = useUrlFilterParams(config);
  stateRef.current = state;
  return null;
};

const setup = (config: UrlFilterConfig, initialEntries: string[]) => {
  const stateRef: { current: UrlFilterState | null } = { current: null };
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Harness config={config} stateRef={stateRef} />
    </MemoryRouter>
  );
  return stateRef;
};

describe('useUrlFilterParams', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores values and page from the URL on mount', () => {
    const stateRef = setup(
      { params: ['query', 'status', 'integration', 'page'] },
      ['/rules?query=aws&status=enabled&integration=aws&page=3&space=standard']
    );

    expect(stateRef.current?.values).toEqual({ query: 'aws', status: 'enabled', integration: 'aws' });
    expect(stateRef.current?.page).toBe(3);
  });

  it('writes only the patched key and preserves siblings after debounce', () => {
    const stateRef = setup({ params: ['query', 'status', 'page'] }, ['/rules?status=enabled&space=standard']);

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
    const stateRef = setup({ params: ['query'] }, ['/rules']);

    act(() => {
      stateRef.current?.setParams({ query: 'a' });
    });
    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(stateRef.current?.values.query).toBe('a');
  });

  it('resets page to 1 when a resetPageOn param changes', () => {
    const stateRef = setup({ params: ['query', 'status', 'page'] }, ['/rules?page=3']);

    act(() => {
      stateRef.current?.setParams({ status: 'enabled' });
    });

    expect(stateRef.current?.page).toBe(1);
  });

  it('does not apply the page param for tables that opt out of it', () => {
    const stateRef = setup({ params: ['query', 'status'] }, ['/rules?page=5']);

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
    const stateRef = setup({ params: ['page'] }, ['/rules?page=not-a-number']);

    expect(stateRef.current?.page).toBe(1);
  });

  it('clears a param via clearParam', () => {
    const stateRef = setup({ params: ['status'] }, ['/rules?status=enabled']);

    act(() => {
      stateRef.current?.clearParam('status');
    });

    expect(stateRef.current?.values.status).toBe('');
  });
});
