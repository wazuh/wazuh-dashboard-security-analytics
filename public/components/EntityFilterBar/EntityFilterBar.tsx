/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiCompressedSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  IntegrationComboBox,
} from '../IntegrationComboBox/IntegrationComboBox';
import { useIntegrationSelector } from '../IntegrationComboBox/useIntegrationSelector';

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
  });

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
            options={options}
            selectedId={
              options.find((o) => o.value === integration.selectedName)?.id ?? ''
            }
            isLoading={loading}
            resourceName="items"
            space={integration.space}
            fullWidth
            onChange={(selected) => integration.onChange(selected[0]?.value ?? '')}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export default EntityFilterBar;
