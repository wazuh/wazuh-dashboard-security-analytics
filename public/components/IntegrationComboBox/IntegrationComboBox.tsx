/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiButtonEmpty,
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
import { SpaceTypes } from '../../../common/constants';
import { getPreviousSpace } from '../../../common/helpers';
import { PromoteSpaces } from '../../../types';
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
  /**
   * Wazuh: no longer read. The empty-state copy dropped "to add <resourceName> to",
   * and seven call sites still pass it. Remove the prop and those call sites together.
   */
  resourceName?: string;
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

  // Wazuh: when there is nothing to pick, say so on the control itself. A callout here
  // competed with the form it belonged to, and the combo box is already disabled, so the
  // help text only has to supply the reason.
  const noOptions = !isLoading && options.length === 0;
  // Where picking one is optional, name the space it would come from. Draft has no
  // previous stage, integrations are created there, and standard is not a stage at all.
  const previousSpace = getPreviousSpace(space as PromoteSpaces);
  const optionalNextStep = previousSpace
    ? ` Promote one from the ${SpaceTypes[
        previousSpace.toUpperCase() as keyof typeof SpaceTypes
      ].label.toLowerCase()} space to evaluate it.`
    : space === SpaceTypes.DRAFT.value
    ? ' Create one to evaluate it.'
    : '';
  // The create button only renders when `notifications` is given, so telling the user to
  // create one is only worth saying where that button is absent.
  const nextStep = isOptional
    ? optionalNextStep
    : notifications
    ? ''
    : ' Create an integration first.';
  const emptyHelpText = noOptions
    ? `There are no integrations in the ${space} space.${nextStep}`
    : undefined;

  return (
    <>
      <EuiCompressedFormRow
        label={label}
        isInvalid={isInvalid}
        error={error}
        helpText={emptyHelpText}
        fullWidth={fullWidth}
      >
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
