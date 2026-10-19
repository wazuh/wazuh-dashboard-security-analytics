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
  EuiIconTip,
} from '@elastic/eui';
import { LogTestScope, LogTestTraceLevel } from '../../../../types';
import { MetadataEntry } from '../utils';
import { LOG_TEST_HELP } from '../constants';
import { MetadataFieldsEditor } from './MetadataFieldsEditor';
import { NormalizedEventEditor } from './NormalizedEventEditor';
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
  /** Wazuh: the JSON text of the event evaluated by a detection-only test. */
  normalizedEvent: string;
}

export interface LogTestFormErrors {
  queue?: string;
  event?: string;
  space?: string;
  integration?: string;
  normalizedEvent?: string;
}

/** Wazuh: an integration option, flagged when a detection-only test cannot use it. */
export interface LogTestIntegrationOption extends IntegrationOption {
  rulesCount: number;
  disabled?: boolean;
}

export interface LogTestFormProps {
  formData: LogTestFormData;
  errors: LogTestFormErrors;
  onFormChange: (field: keyof LogTestFormData, value: any) => void;
  onMetadataFieldsChange: (fields: MetadataEntry[]) => void;
  integrationOptions: LogTestIntegrationOption[];
  isLoadingIntegrations?: boolean;
  scope?: LogTestScope;
  lastNormalizedOutput?: object | null;
  disabled?: boolean;
}

const LabelWithTip: React.FC<{ label: React.ReactNode; tip: string }> = ({ label, tip }) => (
  <>
    {label} <EuiIconTip content={tip} type="questionInCircle" color="subdued" size="s" />
  </>
);

export const LogTestForm: React.FC<LogTestFormProps> = ({
  formData,
  errors,
  onFormChange,
  onMetadataFieldsChange,
  integrationOptions,
  isLoadingIntegrations = false,
  scope = 'full',
  lastNormalizedOutput,
  disabled = false,
}) => {
  const runsNormalization = scope !== 'detection';
  const runsDetection = scope !== 'normalization';

  // Wazuh: a detection-only test evaluates nothing with an integration that has no rules
  // in this space, so those are listed, to show they exist, but cannot be picked.
  const options =
    scope === 'detection'
      ? integrationOptions.map((option) =>
          option.rulesCount > 0
            ? option
            : { ...option, disabled: true, label: `${option.label} (no rules in this space)` }
        )
      : integrationOptions;

  return (
    <>
      {runsNormalization && (
        <>
          <EuiTitle size="xs">
            <h3>Normalization</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem style={{ minWidth: '300px' }}>
              <EuiFormRow
                label={
                  <LabelWithTip
                    label={
                      <>
                        {'Location - '}
                        <em>optional</em>
                      </>
                    }
                    tip={LOG_TEST_HELP.location}
                  />
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
              <EuiFormRow
                label={<LabelWithTip label="Trace level" tip={LOG_TEST_HELP.traceLevel} />}
                fullWidth
              >
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
        </>
      )}

      {runsDetection && (
        <>
          <EuiTitle size="xs">
            <h3>Detection</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem style={{ minWidth: '300px' }}>
              {/* Wazuh: required in both scopes that evaluate rules. A test that should
                  evaluate none is what Normalization only is for. */}
              <IntegrationComboBox
                label={
                  <LabelWithTip
                    label="Integration"
                    tip={
                      scope === 'detection'
                        ? LOG_TEST_HELP.integrationDetection
                        : LOG_TEST_HELP.integrationFull
                    }
                  />
                }
                options={options}
                selectedId={formData.integration}
                isLoading={isLoadingIntegrations}
                resourceName="log test"
                space={formData.space}
                isInvalid={!!errors.integration}
                error={errors.integration}
                onChange={(e) => onFormChange('integration', e[0]?.id || '')}
                data-test-subj="logTestIntegration"
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: '200px' }} />
          </EuiFlexGroup>

          <EuiSpacer size="l" />
        </>
      )}

      {runsNormalization ? (
        <>
          <EuiTitle size="xs">
            <h3>
              <LabelWithTip label="Log event" tip={LOG_TEST_HELP.logEvent} />
            </h3>
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
      ) : (
        <NormalizedEventEditor
          value={formData.normalizedEvent}
          onChange={(value) => onFormChange('normalizedEvent', value)}
          error={errors.normalizedEvent}
          lastNormalizedOutput={lastNormalizedOutput}
          disabled={disabled}
        />
      )}
    </>
  );
};
