/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  asEntityStatus,
  countStatuses,
  EntityStatusValue,
  useStatusCounts,
  UseStatusCountsOptions,
} from './useStatusCounts';

type HookResult = ReturnType<typeof useStatusCounts>;

const renderUseStatusCounts = (
  countByStatus: (status: EntityStatusValue) => Promise<number>,
  options?: UseStatusCountsOptions
) => {
  const result: { current: HookResult | undefined } = { current: undefined };
  const Harness = (props: {
    countByStatus: (status: EntityStatusValue) => Promise<number>;
    options?: UseStatusCountsOptions;
  }) => {
    result.current = useStatusCounts(props.countByStatus, props.options);
    return null;
  };
  const utils = render(<Harness countByStatus={countByStatus} options={options} />);
  return {
    result,
    rerender: (nextCount: typeof countByStatus, nextOptions?: UseStatusCountsOptions) =>
      utils.rerender(<Harness countByStatus={nextCount} options={nextOptions} />),
  };
};

const flush = () => act(() => Promise.resolve());

describe('useStatusCounts', () => {
  it('counts each status once', async () => {
    const countByStatus = jest.fn(async (status: EntityStatusValue) =>
      status === 'enabled' ? 10 : 3
    );
    const { result } = renderUseStatusCounts(countByStatus);

    expect(result.current?.loading).toBe(true);
    await flush();

    expect(countByStatus.mock.calls).toEqual([['enabled'], ['disabled']]);
    expect(result.current?.counts).toEqual({ enabled: 10, disabled: 3 });
    expect(result.current?.loading).toBe(false);
  });

  it('does not fetch while disabled', async () => {
    const countByStatus = jest.fn(async () => 1);
    const { result } = renderUseStatusCounts(countByStatus, { enabled: false });
    await flush();

    expect(countByStatus).not.toHaveBeenCalled();
    expect(result.current?.counts).toBeUndefined();
    expect(result.current?.loading).toBe(false);
  });

  it('is loading from the first render, so the spinner shows before the request starts', async () => {
    const loadingByRender: boolean[] = [];
    const countByStatus = async () => 1;
    const Harness = () => {
      loadingByRender.push(useStatusCounts(countByStatus).loading);
      return null;
    };
    render(<Harness />);
    await flush();

    expect(loadingByRender[0]).toBe(true);
  });

  it('refetches on reload() and on a new reloadTrigger', async () => {
    const countByStatus = jest.fn(async () => 1);
    const { result, rerender } = renderUseStatusCounts(countByStatus, { reloadTrigger: 0 });
    await flush();
    expect(countByStatus).toHaveBeenCalledTimes(2);

    act(() => result.current?.reload());
    await flush();
    expect(countByStatus).toHaveBeenCalledTimes(4);

    rerender(countByStatus, { reloadTrigger: 1 });
    await flush();
    expect(countByStatus).toHaveBeenCalledTimes(6);
  });

  it('drops the counts when a request fails, so no misleading bar is drawn', async () => {
    const { result } = renderUseStatusCounts(async () => {
      throw new Error('boom');
    });
    await flush();

    expect(result.current?.counts).toBeUndefined();
    expect(result.current?.loading).toBe(false);
  });

  it('ignores the answer of a request a newer one superseded', async () => {
    let resolveStale: (value: number) => void = () => {};
    const stale = jest.fn(
      (status: EntityStatusValue) =>
        new Promise<number>((resolve) => {
          if (status === 'enabled') {
            resolveStale = resolve;
          } else {
            resolve(0);
          }
        })
    );
    const fresh = jest.fn(async (status: EntityStatusValue) => (status === 'enabled' ? 7 : 2));
    const { result, rerender } = renderUseStatusCounts(stale);

    rerender(fresh);
    await flush();
    await act(async () => resolveStale(999));

    expect(result.current?.counts).toEqual({ enabled: 7, disabled: 2 });
  });
});

describe('countStatuses', () => {
  it('splits items by the given predicate', () => {
    const items = [{ on: true }, { on: false }, { on: true }];
    expect(countStatuses(items, (item) => item.on)).toEqual({ enabled: 2, disabled: 1 });
    expect(countStatuses([], () => true)).toEqual({ enabled: 0, disabled: 0 });
  });
});

describe('asEntityStatus', () => {
  it('only accepts the two statuses', () => {
    expect(asEntityStatus('enabled')).toBe('enabled');
    expect(asEntityStatus('disabled')).toBe('disabled');
    expect(asEntityStatus('pepo')).toBeUndefined();
    expect(asEntityStatus(undefined)).toBeUndefined();
  });
});
