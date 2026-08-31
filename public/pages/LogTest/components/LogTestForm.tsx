/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiAccordion,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { LogTestTraceLevel } from '../../../../types';
import { MetadataEntry } from '../utils';
import { MetadataFieldsEditor } from './MetadataFieldsEditor';
import { IntegrationComboBox, IntegrationOption } from '../../../components/IntegrationComboBox';

const TRACE_LEVEL_OPTIONS: Array<{
  value: LogTestTraceLevel;
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}> = [
  {
    value: 'NONE',
    inputDisplay: 'None',
    dropdownDisplay: (
      <>
        <strong>None</strong>
        <EuiText size="s" color="subdued">
          <p className="ouiTextColor--subdued">
            Only the final normalized output. Use for quick checks.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'ASSET_ONLY',
    inputDisplay: 'Asset only',
    dropdownDisplay: (
      <>
        <strong>Asset only</strong>
        <EuiText size="s" color="subdued">
          <p className="ouiTextColor--subdued">Output plus the list of decoders that matched.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'ALL',
    inputDisplay: 'All',
    dropdownDisplay: (
      <>
        <strong>All</strong>
        <EuiText size="s" color="subdued">
          <p className="ouiTextColor--subdued">
            Full trace including every decoder attempted. Use for debugging decoder issues.
          </p>
        </EuiText>
      </>
    ),
  },
];

export interface LogTestFormData {
  queue: number | undefined;
  location: string;
  event: string;
  traceLevel: LogTestTraceLevel;
  space: string;
  metadataFields: MetadataEntry[];
  integration: string;
}

export interface LogTestFormErrors {
  queue?: string;
  event?: string;
  space?: string;
  integration?: string;
}

export interface LogTestFormProps {
  formData: LogTestFormData;
  errors: LogTestFormErrors;
  onFormChange: (field: keyof LogTestFormData, value: any) => void;
  onMetadataFieldsChange: (fields: MetadataEntry[]) => void;
  integrationOptions: IntegrationOption[];
  disabled?: boolean;
}

export const LogTestForm: React.FC<LogTestFormProps> = ({
  formData,
  errors,
  onFormChange,
  onMetadataFieldsChange,
  integrationOptions,
  disabled = false,
}) => {
  return (
    <>
      <EuiTitle size="xs">
        <h3>Normalization</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap>
        <EuiFlexItem style={{ minWidth: '300px' }}>
          <EuiFormRow
            label={
              <>
                {'Location - '}
                <em>optional</em>
              </>
            }
            fullWidth
          >
            <EuiFieldText
              value={formData.location}
              onChange={(e) => onFormChange('location', e.target.value)}
              placeholder="/var/log/auth.log"
              disabled={disabled}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '200px' }}>
          <EuiFormRow label="Trace level" fullWidth>
            <EuiSuperSelect
              options={TRACE_LEVEL_OPTIONS}
              valueOfSelected={formData.traceLevel}
              onChange={(value) => onFormChange('traceLevel', value as LogTestTraceLevel)}
              disabled={disabled}
              fullWidth
              hasDividers
              itemLayoutAlign="top"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="agent-metadata-accordion"
        buttonContent="Metadata (optional)"
        paddingSize="m"
      >
        <EuiSpacer size="s" />
        <MetadataFieldsEditor
          entries={formData.metadataFields}
          onChange={onMetadataFieldsChange}
          disabled={disabled}
        />
      </EuiAccordion>

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>Detection</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap>
        <EuiFlexItem style={{ minWidth: '300px' }}>
          <IntegrationComboBox
            label={
              <>
                {'Integration - '}
                <em>optional</em>
              </>
            }
            options={integrationOptions}
            selectedId={formData.integration}
            resourceName="log test"
            space={formData.space}
            isOptional
            onChange={(e) => onFormChange('integration', e[0]?.id || '')}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '200px' }} />
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>Log event</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow isInvalid={!!errors.event} error={errors.event} fullWidth>
        <EuiTextArea
          placeholder="Enter log data to test..."
          value={formData.event}
          onChange={(e) => onFormChange('event', e.target.value)}
          rows={6}
          isInvalid={!!errors.event}
          disabled={disabled}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
