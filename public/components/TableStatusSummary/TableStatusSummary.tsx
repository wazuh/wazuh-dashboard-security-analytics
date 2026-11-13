/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { EntityStatusValue, StatusCounts } from '../../hooks/useStatusCounts';

export const STATUS_ORDER: EntityStatusValue[] = ['enabled', 'disabled'];

const DEFAULT_STATUS_LABELS: Record<EntityStatusValue, string> = {
  enabled: 'Enabled',
  disabled: 'Disabled',
};

// Wazuh: each status's color is a class in TableStatusSummary.scss, which OSD compiles
// once per theme; an inline color from euiThemeVars would tie the markup (and its
// snapshots) to the theme build.
const statusFillClass = (status: EntityStatusValue) => `tableStatusSummary__fill--${status}`;

export interface TableStatusSummaryProps {
  /** How many items match the current search and filters, across every page. */
  total: number;
  loading?: boolean;
  /** The table's own request failed: the row shows no count rather than a wrong 0. */
  error?: boolean;
  /** Plural entity noun for the accessible labels, e.g. `decoders`. */
  entityPlural: string;
  /**
   * The enabled/disabled split of the whole table, ignoring the search and filters.
   * Leave it undefined where the entity has no status: the bar is not rendered.
   */
  statusCounts?: StatusCounts;
  statusLoading?: boolean;
  /** The status the table is filtered to, if exactly one. */
  activeStatus?: EntityStatusValue;
  /** Applies the status as the table's Status filter, or clears it when active. */
  onStatusClick?: (status: EntityStatusValue) => void;
  /** Detectors read `Active`/`Inactive`. */
  statusLabels?: Record<EntityStatusValue, string>;
  /** What the split counts, for the tooltip, when it is not every item in the space. */
  statusScopeNote?: string;
  'data-test-subj'?: string;
}

export const formatCount = (value: number): string => value.toLocaleString('en-US');

export const formatResults = (total: number): string =>
  `${formatCount(total)} ${total === 1 ? 'result' : 'results'}`;

export const formatPercent = (count: number, total: number): string => {
  if (!total || !count) {
    return '0%';
  }
  const percent = (count / total) * 100;
  if (percent < 1) {
    return '<1%';
  }
  if (percent > 99 && count < total) {
    return '>99%';
  }
  return `${Math.round(percent)}%`;
};

// Wazuh: one row under a ruleset management table's search bar: how many items match
// the search on the left, the enabled/disabled split of the whole table on the right.
// The bar shares the row so it never pushes the table down.
export const TableStatusSummary: React.FC<TableStatusSummaryProps> = ({
  total,
  loading = false,
  error = false,
  entityPlural,
  statusCounts,
  statusLoading = false,
  activeStatus,
  onStatusClick,
  statusLabels = DEFAULT_STATUS_LABELS,
  statusScopeNote,
  'data-test-subj': testSubj = 'tableStatusSummary',
}) => {
  const statusTotal = statusCounts ? statusCounts.enabled + statusCounts.disabled : 0;

  const renderStatus = () => {
    if (statusLoading) {
      return <EuiLoadingSpinner size="s" data-test-subj={`${testSubj}-statusLoading`} />;
    }
    if (!statusCounts || statusTotal === 0) {
      return null;
    }

    const tooltip = (
      <>
        {STATUS_ORDER.map((status) => (
          <div key={status}>
            {`${statusLabels[status]}: ${formatCount(statusCounts[status])} (${formatPercent(
              statusCounts[status],
              statusTotal
            )})`}
          </div>
        ))}
        <div>{`Counts all ${entityPlural}, regardless of the search and filters.`}</div>
        {statusScopeNote && <div>{statusScopeNote}</div>}
      </>
    );

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltip} position="top">
            <div className="tableStatusSummary__bar" data-test-subj={`${testSubj}-bar`}>
              {STATUS_ORDER.filter((status) => statusCounts[status] > 0).map((status) => (
                // Wazuh: the segments repeat the legend buttons below for the mouse, so
                // keyboard and screen reader users get one control per status, not two.
                <button
                  key={status}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={[
                    'tableStatusSummary__segment',
                    statusFillClass(status),
                    activeStatus && activeStatus !== status
                      ? 'tableStatusSummary__segment--dimmed'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  // Wazuh: sized by flex-grow, not a percentage width, so the 1px gap
                  // between the segments never pushes the bar past its width.
                  style={{ flexGrow: statusCounts[status] }}
                  disabled={!onStatusClick}
                  onClick={() => onStatusClick?.(status)}
                  data-test-subj={`${testSubj}-segment-${status}`}
                />
              ))}
            </div>
          </EuiToolTip>
        </EuiFlexItem>
        {STATUS_ORDER.map((status) => {
          const isActive = activeStatus === status;
          return (
            <EuiFlexItem grow={false} key={status}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                color={isActive ? 'primary' : 'text'}
                // Wazuh: filtering to a status nothing has only empties the table, but
                // an active filter must stay clickable so it can be cleared.
                isDisabled={!onStatusClick || (statusCounts[status] === 0 && !isActive)}
                onClick={() => onStatusClick?.(status)}
                aria-pressed={isActive}
                // Wazuh: a click on the active status clears the filter, so say that.
                aria-label={
                  isActive
                    ? `Show all ${entityPlural}`
                    : `Show only ${statusLabels[status].toLowerCase()} ${entityPlural}`
                }
                className={isActive ? 'tableStatusSummary__legend--active' : undefined}
                data-test-subj={`${testSubj}-legend-${status}`}
              >
                <span className="tableStatusSummary__legendContent">
                  <span className={`tableStatusSummary__swatch ${statusFillClass(status)}`} />
                  {`${formatCount(statusCounts[status])} ${statusLabels[status].toLowerCase()}`}
                </span>
              </EuiButtonEmpty>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlexGroup
      className="tableStatusSummary"
      gutterSize="m"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      wrap
      data-test-subj={testSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" aria-live="polite">
          {loading ? (
            <EuiLoadingSpinner size="s" data-test-subj={`${testSubj}-totalLoading`} />
          ) : error ? null : (
            <span data-test-subj={`${testSubj}-total`}>{formatResults(total)}</span>
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{renderStatus()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

// Wazuh: the summary as an EuiInMemoryTable's `childrenBetween`. The table puts its own
// spacer under its search bar, wider than the one the server-paginated lists use, so
// this pulls the row up by the difference: every table shows the row at the same gap.
export const InMemoryTableStatusSummary: React.FC<TableStatusSummaryProps> = (props) => (
  <div className="tableStatusSummary__inMemoryTable">
    <TableStatusSummary {...props} />
    <EuiSpacer size="s" />
  </div>
);
