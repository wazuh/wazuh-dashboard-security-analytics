/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  formatPercent,
  formatResults,
  TableStatusSummary,
  TableStatusSummaryProps,
} from './TableStatusSummary';

const renderSummary = (props: Partial<TableStatusSummaryProps> = {}) =>
  render(
    <TableStatusSummary
      total={1234}
      entityPlural="decoders"
      statusCounts={{ enabled: 1100, disabled: 134 }}
      {...props}
    />
  );

describe('formatResults', () => {
  it('pluralizes and groups thousands', () => {
    expect(formatResults(0)).toBe('0 results');
    expect(formatResults(1)).toBe('1 result');
    expect(formatResults(1234)).toBe('1,234 results');
  });
});

describe('formatPercent', () => {
  it('rounds to whole percentages', () => {
    expect(formatPercent(1100, 1234)).toBe('89%');
    expect(formatPercent(134, 1234)).toBe('11%');
  });

  it('never shows a non-zero share as 0% or a partial one as 100%', () => {
    expect(formatPercent(1, 1000)).toBe('<1%');
    expect(formatPercent(999, 1000)).toBe('>99%');
    expect(formatPercent(0, 1000)).toBe('0%');
    expect(formatPercent(1000, 1000)).toBe('100%');
    expect(formatPercent(0, 0)).toBe('0%');
  });
});

describe('TableStatusSummary', () => {
  it('shows the total results and the enabled/disabled split', () => {
    renderSummary();

    expect(screen.getByTestId('tableStatusSummary-total').textContent).toBe('1,234 results');
    expect(screen.getByTestId('tableStatusSummary-legend-enabled').textContent).toContain(
      '1,100 enabled'
    );
    expect(screen.getByTestId('tableStatusSummary-legend-disabled').textContent).toContain(
      '134 disabled'
    );
  });

  it('sizes each bar segment by its share of the whole table', () => {
    renderSummary({ statusCounts: { enabled: 3, disabled: 1 } });

    expect(screen.getByTestId('tableStatusSummary-segment-enabled').style.width).toBe('75%');
    expect(screen.getByTestId('tableStatusSummary-segment-disabled').style.width).toBe('25%');
  });

  it('draws no segment for a status with no items', () => {
    renderSummary({ statusCounts: { enabled: 5, disabled: 0 } });

    expect(screen.getByTestId('tableStatusSummary-segment-enabled')).toBeTruthy();
    expect(screen.queryByTestId('tableStatusSummary-segment-disabled')).toBeNull();
  });

  it('hides the bar for an entity without status or an empty table', () => {
    const { rerender } = renderSummary({ statusCounts: undefined });
    expect(screen.queryByTestId('tableStatusSummary-bar')).toBeNull();
    expect(screen.getByTestId('tableStatusSummary-total').textContent).toBe('1,234 results');

    rerender(
      <TableStatusSummary
        total={0}
        entityPlural="decoders"
        statusCounts={{ enabled: 0, disabled: 0 }}
      />
    );
    expect(screen.queryByTestId('tableStatusSummary-bar')).toBeNull();
  });

  it('shows spinners instead of stale counts while loading', () => {
    renderSummary({ loading: true, statusLoading: true });

    expect(screen.queryByTestId('tableStatusSummary-total')).toBeNull();
    expect(screen.getByTestId('tableStatusSummary-totalLoading')).toBeTruthy();
    expect(screen.queryByTestId('tableStatusSummary-bar')).toBeNull();
    expect(screen.getByTestId('tableStatusSummary-statusLoading')).toBeTruthy();
  });

  it('applies a status from its legend button or its bar segment', () => {
    const onStatusClick = jest.fn();
    renderSummary({ onStatusClick });

    fireEvent.click(screen.getByTestId('tableStatusSummary-legend-disabled'));
    fireEvent.click(screen.getByTestId('tableStatusSummary-segment-enabled'));

    expect(onStatusClick.mock.calls).toEqual([['disabled'], ['enabled']]);
  });

  it('marks the active status as pressed and names the action', () => {
    renderSummary({ onStatusClick: jest.fn(), activeStatus: 'disabled' });

    const disabled = screen.getByRole('button', { name: 'Show only disabled decoders' });
    const enabled = screen.getByRole('button', { name: 'Show only enabled decoders' });
    expect(disabled.getAttribute('aria-pressed')).toBe('true');
    expect(enabled.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the bar segments out of the keyboard and accessibility tree', () => {
    renderSummary({ onStatusClick: jest.fn() });

    const segment = screen.getByTestId('tableStatusSummary-segment-enabled');
    expect(segment.getAttribute('tabindex')).toBe('-1');
    expect(segment.getAttribute('aria-hidden')).toBe('true');
  });

  it('disables a status with no items unless it is the active filter', () => {
    const { rerender } = renderSummary({
      onStatusClick: jest.fn(),
      statusCounts: { enabled: 5, disabled: 0 },
    });
    expect(
      (screen.getByTestId('tableStatusSummary-legend-disabled') as HTMLButtonElement).disabled
    ).toBe(true);

    rerender(
      <TableStatusSummary
        total={0}
        entityPlural="decoders"
        statusCounts={{ enabled: 5, disabled: 0 }}
        activeStatus="disabled"
        onStatusClick={jest.fn()}
      />
    );
    expect(
      (screen.getByTestId('tableStatusSummary-legend-disabled') as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('is read-only without a click handler', () => {
    renderSummary();

    expect(
      (screen.getByTestId('tableStatusSummary-legend-enabled') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('uses the given status labels', () => {
    renderSummary({
      entityPlural: 'detectors',
      statusCounts: { enabled: 19, disabled: 7 },
      statusLabels: { enabled: 'Active', disabled: 'Inactive' },
      onStatusClick: jest.fn(),
    });

    expect(screen.getByTestId('tableStatusSummary-legend-enabled').textContent).toContain(
      '19 active'
    );
    expect(screen.getByRole('button', { name: 'Show only inactive detectors' })).toBeTruthy();
  });
});
