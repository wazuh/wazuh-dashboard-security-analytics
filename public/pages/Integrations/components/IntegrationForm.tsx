/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCompressedFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiSpacer,
  EuiCompressedSuperSelect,
  EuiCompressedTextArea,
} from '@elastic/eui';
import { IntegrationItem } from '../../../../types';
import React from 'react';
import { LOG_TYPE_NAME_REGEX, validateName } from '../../../utils/validation';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { useState } from 'react';
import { getLogTypeCategoryOptions } from '../../../utils/helpers';

export interface IntegrationFormProps {
  integrationDetails: IntegrationItem;
  isEditMode: boolean;
  confirmButtonText: string;
  notifications: NotificationsStart;
  setIntegrationDetails: (integration: IntegrationItem) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const IntegrationForm: React.FC<IntegrationFormProps> = ({
  integrationDetails,
  isEditMode,
  confirmButtonText,
  notifications,
  setIntegrationDetails,
  onCancel,
  onConfirm,
}) => {
  const [nameError, setNameError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);

  const updateErrors = (details: IntegrationItem, onSubmit = false) => {
    const nameInvalid = !validateName(details.name, LOG_TYPE_NAME_REGEX, false /* shouldTrim */);
    const categoryInvalid = (categoryTouched || onSubmit) && !details.category;
    setNameError(nameInvalid ? 'Invalid name' : '');
    setCategoryError(categoryInvalid ? 'Select category to assign' : '');

    return { nameInvalid, categoryInvalid };
  };
  const onConfirmClicked = () => {
    const { nameInvalid, categoryInvalid } = updateErrors(integrationDetails, true);

    if (nameInvalid || categoryInvalid) {
      notifications?.toasts.addDanger({
        title: `Failed to ${confirmButtonText.toLowerCase()}`,
        text: `Fix the marked errors.`,
        toastLifeTimeMs: 3000,
      });

      return;
    }
    onConfirm();
  };

  return (
    <>
      <EuiCompressedFormRow
        label="Name"
        helpText={
          isEditMode &&
          'Must contain 2-50 characters. Valid characters are a-z, 0-9, hyphens, and underscores'
        }
        isInvalid={!!nameError}
        error={nameError}
      >
        <EuiCompressedFieldText
          value={integrationDetails?.name}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              name: e.target.value,
            };
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          readOnly={!isEditMode}
          disabled={isEditMode && !!integrationDetails.detectionRulesCount}
        />
      </EuiCompressedFormRow>
      <EuiSpacer />
      <EuiCompressedFormRow
        label={
          <>
            {'Description - '}
            <em>optional</em>
          </>
        }
      >
        <EuiCompressedTextArea
          value={integrationDetails?.description}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              description: e.target.value,
            };
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          placeholder="Description of the integration" // Replace Log Type with Integration by Wazuh
          readOnly={!isEditMode}
        />
      </EuiCompressedFormRow>
      <EuiSpacer />
      <EuiCompressedFormRow label="Category" isInvalid={!!categoryError} error={categoryError}>
        <EuiCompressedSuperSelect
          options={getLogTypeCategoryOptions().map((option) => ({
            ...option,
            disabled: !isEditMode || (isEditMode && !!integrationDetails.detectionRulesCount),
          }))}
          valueOfSelected={integrationDetails?.category}
          onChange={(value) => {
            const newIntegration = {
              ...integrationDetails,
              category: value,
            };
            setCategoryTouched(true);
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          hasDividers
          itemLayoutAlign="top"
        ></EuiCompressedSuperSelect>
      </EuiCompressedFormRow>
      {isEditMode ? (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross" onClick={onCancel}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill iconType="check" size="s" onClick={onConfirmClicked}>
                {confirmButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      ) : null}
    </>
  );
};
