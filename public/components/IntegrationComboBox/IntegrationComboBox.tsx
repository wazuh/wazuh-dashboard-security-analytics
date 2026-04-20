/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCompressedComboBox,
  EuiCompressedFormRow,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import FormFieldHeader from '../FormFieldHeader';
import { getLogTypeLabel } from '../../pages/LogTypes/utils/helpers';
import { IntegrationOption } from './useIntegrationSelector';
import { CreateIntegrationFlyout } from '../../pages/Integrations/components/CreateIntegrationFlyout';

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
  isInvalid?: boolean;
  error?: string;
}

export const IntegrationComboBox: React.FC<IntegrationComboBoxProps> = ({
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
      <EuiCompressedFormRow
        label={
          <div>
            <FormFieldHeader headerTitle={'Integration'} />
            <EuiSpacer size={'s'} />
          </div>
        }
        fullWidth={true}
        isInvalid={isInvalid}
        error={error}
      >
        <EuiCompressedComboBox
          placeholder="Select integration"
          data-test-subj={dataTestSubj}
          options={options}
          singleSelection={{ asPlainText: true }}
          onChange={onChange}
          isLoading={isLoading}
          isDisabled={isLoading || options.length === 0}
          isInvalid={isInvalid}
          selectedOptions={
            selectedOption
              ? [
                  {
                    value: selectedOption.value,
                    label: getLogTypeLabel(selectedOption.value),
                  },
                ]
              : []
          }
        />
      </EuiCompressedFormRow>

      {notifications && (
        <>
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="s"
            iconType="plusInCircle"
            onClick={() => setIsFlyoutOpen(true)}
            flush="left"
          >
            Create integration
          </EuiButtonEmpty>
          <EuiSpacer size="xs" />
        </>
      )}

      {!isLoading && options.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="No integrations available" color="warning" iconType="alert">
            <p>
              There are no integrations in draft status available to add {resourceName}. Please
              create or draft an integration first before adding {resourceName}.
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
