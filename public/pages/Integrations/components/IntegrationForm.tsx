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
} from "@elastic/eui";
import { IntegrationItem } from "../../../../types";
import React from "react";
import {
  LOG_TYPE_NAME_REGEX,
  validateName,
} from "../../../utils/validation";
import { NotificationsStart } from "opensearch-dashboards/public";
import { useState } from "react";
import { getIntegrationCategoryOptions } from "../../../utils/helpers";

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
  const [nameError, setNameError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [authorError, setAuthorError] = useState("");

  const updateErrors = (details: IntegrationItem, onSubmit = false) => {
    const nameInvalid = !validateName(
      details.document.title,
      LOG_TYPE_NAME_REGEX,
      false /* shouldTrim */,
    );
    const authorInvalid = !validateName(
      details.document.author,
      LOG_TYPE_NAME_REGEX,
      false /* shouldTrim */,
    );
    const categoryInvalid =
      (categoryTouched || onSubmit) && !details.document.category;
    setNameError(nameInvalid ? "Invalid name" : "");
    setCategoryError(categoryInvalid ? "Select category to assign" : "");
    setAuthorError(authorInvalid ? "Invalid author" : "");

    return { nameInvalid, categoryInvalid };
  };
  const onConfirmClicked = () => {
    const { nameInvalid, categoryInvalid } = updateErrors(
      integrationDetails,
      true,
    );

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
          "Must contain 2-50 characters. Valid characters are a-z, 0-9, hyphens, and underscores"
        }
        isInvalid={!!nameError}
        error={nameError}
      >
        <EuiCompressedFieldText
          value={integrationDetails?.document.title}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              document: {
                ...integrationDetails!.document,
                title: e.target.value,
              },
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
            {"Description - "}
            <em>optional</em>
          </>
        }
      >
        <EuiCompressedTextArea
          value={integrationDetails?.document?.description}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              document: {
                ...integrationDetails!.document,
                description: e.target.value,
              },
            };
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          placeholder="Description of the integration" // Replace Log Type with Integration by Wazuh
          readOnly={!isEditMode}
        />
      </EuiCompressedFormRow>
      <EuiSpacer />
      <EuiCompressedFormRow
        label="Category"
        isInvalid={!!categoryError}
        error={categoryError}
      >
        <EuiCompressedSuperSelect
          options={getIntegrationCategoryOptions().map((option) => ({
            ...option,
            disabled:
              !isEditMode ||
              (isEditMode && !!integrationDetails.detectionRulesCount),
          }))}
          value={integrationDetails?.document.category}
          onChange={(value) => {
            const newIntegration = {
              ...integrationDetails!,
              document: {
                ...integrationDetails!.document,
                category: value,
              },
            };
            setCategoryTouched(true);
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          readOnly={!isEditMode}
          disabled={isEditMode && !!integrationDetails.detectionRulesCount}
        />
        {/* <EuiCompressedSuperSelect
          options={getLogTypeCategoryOptions().map((option) => ({
            ...option,
            disabled: !isEditMode || (isEditMode && !!integrationDetails.detectionRulesCount),
          }))}
          valueOfSelected={integrationDetails?.document.category}
          onChange={(value) => {
            const newIntegration = {
              ...integrationDetails,
              document: {
                ...integrationDetails.document,
                category: value,
              },
            };
            setCategoryTouched(true);
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          hasDividers
          itemLayoutAlign="top"
        ></EuiCompressedSuperSelect> */}
      </EuiCompressedFormRow>
      <EuiCompressedFormRow
        label="Author"
        helpText={isEditMode && "Must contain 2-50 characters."}
        isInvalid={!!authorError}
        error={authorError}
      >
        <EuiCompressedFieldText
          value={integrationDetails?.document.author}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              document: {
                ...integrationDetails!.document,
                author: e.target.value,
              },
            };
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          readOnly={!isEditMode}
          disabled={isEditMode && !!integrationDetails.detectionRulesCount}
        />
      </EuiCompressedFormRow>
      <EuiCompressedFormRow
        label="Documentation"
        helpText={isEditMode && "Must contain 2-100 characters."}
      >
        <EuiCompressedFieldText
          value={integrationDetails?.document.documentation}
          onChange={(e) => {
            const newIntegration = {
              ...integrationDetails!,
              document: {
                ...integrationDetails!.document,
                documentation: e.target.value,
              },
            };
            setIntegrationDetails(newIntegration);
            updateErrors(newIntegration);
          }}
          readOnly={!isEditMode}
          disabled={isEditMode && !!integrationDetails.detectionRulesCount}
        />
      </EuiCompressedFormRow>
      {isEditMode ? (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="ghost"
                size="s"
                iconType="cross"
                onClick={onCancel}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill
                iconType="check"
                size="s"
                onClick={onConfirmClicked}
              >
                {confirmButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      ) : null}
    </>
  );
};
