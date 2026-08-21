/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCompressedComboBox,
  EuiCompressedFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { ReactNode, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import FormFieldHeader from '../FormFieldHeader';
import { IntegrationOption } from './useIntegrationSelector';
import { CreateIntegrationFlyout } from '../../pages/Integrations/components/CreateIntegrationFlyout';

const DEFAULT_LABEL = (
  <div>
    <FormFieldHeader headerTitle={'Integration'} />
    <EuiSpacer size={'s'} />
  </div>
);

interface IntegrationComboBoxProps {
  options: IntegrationOption[];
  selectedId: string;
  isLoading: boolean;
  onChange: (options: IntegrationOption[]) => void;
  resourceName: string;
  /** Required to enable the inline create-integration flyout */
  notifications?: NotificationsStart;
  /** Called after a new integration is successfully created via the flyout */
  onCreateSuccess?: (newOption: IntegrationOption) => void;
  'data-test-subj'?: string;
  label?: ReactNode;
  isInvalid?: boolean;
  error?: string;
  space?: string;
  fullWidth?: boolean;
  /** True where picking an integration is optional, so the empty state must not demand one. */
  isOptional?: boolean;
}

export const IntegrationComboBox: React.FC<IntegrationComboBoxProps> = ({
  label = DEFAULT_LABEL,
  options,
  selectedId,
  isLoading,
  onChange,
  resourceName,
  notifications,
  onCreateSuccess,
  'data-test-subj': dataTestSubj,
  isInvalid,
  error,
  space = 'draft',
  fullWidth = false,
  isOptional = false,
}) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const selectedOption = options.find((o) => o.id === selectedId);

  const handleFlyoutSuccess = (id: string, title: string) => {
    setIsFlyoutOpen(false);
    const newOption: IntegrationOption = { id, value: title, label: title };
    onCreateSuccess?.(newOption);
  };

  return (
    <>
      <EuiCompressedFormRow label={label} isInvalid={isInvalid} error={error} fullWidth={fullWidth}>
        {notifications ? (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            justifyContent="flexStart"
          >
            <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
              <EuiCompressedComboBox
                placeholder="Select integration"
                data-test-subj={dataTestSubj}
                options={options}
                singleSelection={{ asPlainText: true }}
                onChange={onChange}
                isLoading={isLoading}
                isDisabled={isLoading || options.length === 0}
                isInvalid={isInvalid}
                fullWidth={fullWidth}
                selectedOptions={
                  selectedOption
                    ? [
                        {
                          value: selectedOption.value,
                          label: selectedOption.label,
                        },
                      ]
                    : []
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="plusInCircle"
                iconSide="left"
                onClick={() => setIsFlyoutOpen(true)}
              >
                Create integration
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiCompressedComboBox
            placeholder="Select integration"
            data-test-subj={dataTestSubj}
            options={options}
            singleSelection={{ asPlainText: true }}
            onChange={onChange}
            isLoading={isLoading}
            isDisabled={isLoading || options.length === 0}
            isInvalid={isInvalid}
            fullWidth={fullWidth}
            selectedOptions={
              selectedOption
                ? [
                    {
                      value: selectedOption.value,
                      label: selectedOption.label,
                    },
                  ]
                : []
            }
          />
        )}
      </EuiCompressedFormRow>

      {!isLoading && options.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="No integrations available" color="warning" iconType="alert">
            <p>
              {/* Wazuh: names the space it was given, and only demands an integration where
                  one is actually required. */}
              There are no integrations in the {space} space to add {resourceName} to.
              {isOptional
                ? ' Promote or create one in a space that allows it to narrow the results.'
                : ' Create an integration first.'}
            </p>
          </EuiCallOut>
        </>
      )}

      {isFlyoutOpen && notifications && (
        <CreateIntegrationFlyout
          notifications={notifications}
          onClose={() => setIsFlyoutOpen(false)}
          onSuccess={handleFlyoutSuccess}
        />
      )}
    </>
  );
};
