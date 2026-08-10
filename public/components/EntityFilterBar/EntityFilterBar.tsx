/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import { EuiCompressedSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  IntegrationComboBox,
} from '../IntegrationComboBox/IntegrationComboBox';
import { useIntegrationSelector, IntegrationOption } from '../IntegrationComboBox/useIntegrationSelector';

// Wazuh: sentinel id for a stale `?integration=<name>` (renamed/deleted integration).
// Design A6: show the name verbatim as a read-only-looking selection, no crash, no
// toast, no silent param clearing — the visible pill explains the empty result set.
export const STALE_INTEGRATION_OPTION_ID = '__stale_integration__';

export type StatusFilterValue = '' | 'enabled' | 'disabled';

const STATUS_OPTIONS = [
  { value: '', text: 'All' },
  { value: 'enabled', text: 'Enabled' },
  { value: 'disabled', text: 'Disabled' },
];

export interface EntityFilterBarProps {
  status: StatusFilterValue;
  onStatusChange: (status: StatusFilterValue) => void;
  /** Omit to hide the Integration dropdown (e.g. Detectors, Filters). */
  integration?: {
    selectedName: string;
    onChange: (name: string) => void;
    notifications?: NotificationsStart;
    space?: string;
  };
  'data-test-subj'?: string;
}

// Wazuh: shared Status + Integration filter bar shown above entity tables.
// Unwired shell for Commit 1 — containers wire it up per-entity in later commits.
export const EntityFilterBar: React.FC<EntityFilterBarProps> = ({
  status,
  onStatusChange,
  integration,
  'data-test-subj': dataTestSubj,
}) => {
  const { options, loading } = useIntegrationSelector({
    notifications: integration?.notifications as NotificationsStart,
    enabled: Boolean(integration),
    space: integration?.space,
  });

  // Wazuh: design A6 — a selected integration name that no longer matches any real
  // option (renamed/deleted integration) must still show verbatim as the selected
  // value, not silently blank out. Append it as a synthetic, display-only option
  // instead of clearing the selection.
  const selectedName = integration?.selectedName;
  const matchedOption = selectedName
    ? options.find((o) => o.value === selectedName)
    : undefined;
  const comboBoxOptions: IntegrationOption[] = useMemo(() => {
    if (!selectedName || matchedOption) {
      return options;
    }
    return [
      ...options,
      { id: STALE_INTEGRATION_OPTION_ID, value: selectedName, label: selectedName },
    ];
  }, [options, selectedName, matchedOption]);
  const selectedId = matchedOption
    ? matchedOption.id
    : selectedName
    ? STALE_INTEGRATION_OPTION_ID
    : '';

  return (
    <EuiFlexGroup gutterSize="s" data-test-subj={dataTestSubj ?? 'entityFilterBar'}>
      <EuiFlexItem grow={false}>
        <EuiCompressedSelect
          data-test-subj="entityFilterBarStatus"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilterValue)}
          aria-label="Filter by status"
        />
      </EuiFlexItem>
      {integration && (
        <EuiFlexItem grow={false} style={{ minWidth: 240 }}>
          <IntegrationComboBox
            data-test-subj="entityFilterBarIntegration"
            options={comboBoxOptions}
            selectedId={selectedId}
            isLoading={loading}
            resourceName="items"
            space={integration.space}
            fullWidth
            label=""
            hideEmptyStateCallout
            onChange={(selected) => integration.onChange(selected[0]?.value ?? '')}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export default EntityFilterBar;
