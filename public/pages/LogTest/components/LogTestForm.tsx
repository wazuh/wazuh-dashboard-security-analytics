/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiAccordion,
  EuiSpacer,
  EuiSelect,
} from '@elastic/eui';
import { LogTestTraceLevel } from '../../../../types';
import { MetadataEntry } from '../utils';
import { MetadataFieldsEditor } from './MetadataFieldsEditor';

const TRACE_LEVEL_OPTIONS: Array<{ value: LogTestTraceLevel; text: string }> = [
  { value: 'NONE', text: 'None' },
  { value: 'ASSET_ONLY', text: 'Asset only' },
  { value: 'ALL', text: 'All' },
];

export interface LogTestIntegrationOption {
  id: string;
  label: string;
}

export interface LogTestFormData {
  queue: number | undefined;
  location: string;
  event: string;
  traceLevel: LogTestTraceLevel;
  integrationId: string;
  metadataFields: MetadataEntry[];
}

export interface LogTestFormErrors {
  queue?: string;
  location?: string;
  event?: string;
  integrationId?: string;
}

export interface LogTestFormProps {
  formData: LogTestFormData;
  errors: LogTestFormErrors;
  onFormChange: (field: keyof LogTestFormData, value: any) => void;
  onMetadataFieldsChange: (fields: MetadataEntry[]) => void;
  integrationOptions: LogTestIntegrationOption[];
  isLoadingIntegrations: boolean;
  disabled?: boolean;
}

export const LogTestForm: React.FC<LogTestFormProps> = ({
  formData,
  errors,
  onFormChange,
  onMetadataFieldsChange,
  integrationOptions,
  isLoadingIntegrations,
  disabled = false,
}) => {
  const integrationSelectOptions = [
    {
      value: '',
      text: isLoadingIntegrations ? 'Loading integrations...' : 'Select integration',
    },
    ...integrationOptions.map((option) => ({ value: option.id, text: option.label })),
  ];

  return (
    <>
      <EuiFlexGroup gutterSize="m" wrap>
        {/* <EuiFlexItem style={{ minWidth: '300px' }}>
                    <EuiFormRow
                        label="Queue"
                        isInvalid={!!errors.queue}
                        error={errors.queue}
                        fullWidth
                    >
                        <EuiFieldNumber
                            value={formData.queue ?? ''}
                            onChange={(e) =>
                                onFormChange(
                                    'queue',
                                    e.target.value ? Number(e.target.value) : undefined
                                )
                            }
                            min={1}
                            max={255}
                            isInvalid={!!errors.queue}
                            disabled={disabled}
                            fullWidth
                        />
                    </EuiFormRow>
                </EuiFlexItem> */}
        <EuiFlexItem style={{ minWidth: '300px' }}>
          <EuiFormRow
            label="Location"
            isInvalid={!!errors.location}
            error={errors.location}
            fullWidth
          >
            <EuiFieldText
              value={formData.location}
              onChange={(e) => onFormChange('location', e.target.value)}
              placeholder="/var/log/auth.log"
              isInvalid={!!errors.location}
              disabled={disabled}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '200px' }}>
          <EuiFormRow label="Trace level" fullWidth>
            <EuiSelect
              options={TRACE_LEVEL_OPTIONS}
              value={formData.traceLevel}
              onChange={(e) => onFormChange('traceLevel', e.target.value as LogTestTraceLevel)}
              disabled={disabled}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '280px' }}>
          <EuiFormRow
            label="Integration"
            isInvalid={!!errors.integrationId}
            error={errors.integrationId}
            fullWidth
          >
            <EuiSelect
              options={integrationSelectOptions}
              value={formData.integrationId}
              onChange={(e) => onFormChange('integrationId', e.target.value)}
              isInvalid={!!errors.integrationId}
              disabled={disabled || isLoadingIntegrations || integrationOptions.length === 0}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isLoadingIntegrations && integrationOptions.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title="No integrations available in test space"
            color="warning"
            iconType="alert"
          >
            <p>
              There are no integrations in test space available for Log test. Promote or create
              integrations before running this test.
            </p>
          </EuiCallOut>
        </>
      )}

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
      <EuiSpacer size="m" />
      <EuiFormRow label="Log event" isInvalid={!!errors.event} error={errors.event} fullWidth>
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
