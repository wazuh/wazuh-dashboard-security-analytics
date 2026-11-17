/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  EuiToolTip,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCompressedFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiCompressedSwitch,
  EuiSpacer,
  EuiCompressedSuperSelect,
  EuiCompressedTextArea,
  EuiText,
} from '@elastic/eui';
import { IntegrationItem } from '../../../../types';
import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  INTEGRATION_AUTHOR_REGEX,
  LOG_TYPE_NAME_REGEX,
  validateName,
} from '../../../utils/validation';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { useState } from 'react';
import { isEqual } from 'lodash';
import { errorNotificationToast, getIntegrationCategoryOptions } from '../../../utils/helpers';
import { FormFieldArray } from '../../../components/FormFieldArray';

interface ReadOnlyFieldProps {
  value: string | undefined;
  placeholder?: string;
  isTextArea?: boolean;
  noTruncate?: boolean;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
  value,
  placeholder = '-',
  isTextArea = false,
  noTruncate = false,
}) => (
  <EuiText
    size="s"
    style={{
      padding: '6px 0',
      lineHeight: isTextArea || noTruncate ? '1.5' : '20px',
      whiteSpace: isTextArea || noTruncate ? 'pre-wrap' : 'nowrap',
      overflow: isTextArea || noTruncate ? 'visible' : 'hidden',
      textOverflow: isTextArea || noTruncate ? undefined : 'ellipsis',
      textAlign: isTextArea || noTruncate ? 'justify' : undefined,
    }}
  >
    {value || placeholder}
  </EuiText>
);

type RequiredField = 'title' | 'category' | 'author';

const untouchedFields: Record<RequiredField, boolean> = {
  title: false,
  category: false,
  author: false,
};

const getValidationErrors = (details: IntegrationItem): Record<RequiredField, string> => {
  const metadata = details.document.metadata;
  return {
    title: validateName(metadata?.title, LOG_TYPE_NAME_REGEX, false) ? '' : 'Invalid title',
    category: details.document.category ? '' : 'Select category to assign',
    author: validateName(metadata?.author, INTEGRATION_AUTHOR_REGEX, false) ? '' : 'Invalid author',
  };
};

export interface IntegrationFormHandle {
  submit: () => void;
}

export interface IntegrationFormProps {
  integrationDetails: IntegrationItem;
  isEditMode: boolean;
  confirmButtonText: string;
  notifications: NotificationsStart;
  onCancel: () => void;
  onConfirm: (integrationData: IntegrationItem) => void | Promise<void>;
  hideBottomBar?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const IntegrationForm = forwardRef<IntegrationFormHandle, IntegrationFormProps>(
  function IntegrationForm(
    {
      integrationDetails,
      isEditMode,
      confirmButtonText,
      notifications,
      onCancel,
      onConfirm,
      hideBottomBar = false,
      onDirtyChange,
    },
    ref
  ) {
    const hasMountedRef = useRef(false);
    const initialIntegrationRef = useRef(integrationDetails);
    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => {
      onDirtyChangeRef.current = onDirtyChange;
    });

    const showEnabledField = isEditMode && !integrationDetails.id;
    const [editingIntegration, setEditingIntegration] =
      useState<IntegrationItem>(integrationDetails);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Wazuh: a field is marked invalid only once the user leaves it or tries to submit, so
    // typing the title does not flag Category and Author before the user reaches them.
    const [touchedFields, setTouchedFields] = useState(untouchedFields);
    const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);

    useEffect(() => {
      if (isEditMode) {
        setEditingIntegration(integrationDetails);
      }
    }, [isEditMode, integrationDetails]);

    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      const isDirty = !isEqual(editingIntegration, initialIntegrationRef.current);
      onDirtyChangeRef.current?.(isDirty);
    }, [editingIntegration]);

    const validationErrors = useMemo(
      () => getValidationErrors(editingIntegration),
      [editingIntegration]
    );
    const getVisibleError = (field: RequiredField) =>
      touchedFields[field] || isSubmitAttempted ? validationErrors[field] : '';
    const titleError = getVisibleError('title');
    const categoryError = getVisibleError('category');
    const authorError = getVisibleError('author');

    const markTouched = (field: RequiredField) =>
      setTouchedFields((touched) => (touched[field] ? touched : { ...touched, [field]: true }));
    const categoryOptions = useMemo(() => getIntegrationCategoryOptions(), []);
    const categoryOptionsWithDisabled = useMemo(
      () =>
        categoryOptions.map((option) => ({
          ...option,
          disabled: !!integrationDetails.detectionRulesCount,
        })),
      [categoryOptions, integrationDetails.detectionRulesCount]
    );

    const getCategoryLabel = useCallback(
      (categoryValue: string | undefined): string | undefined => {
        if (!categoryValue) return undefined;
        const found = categoryOptions.find((opt) => opt.value === categoryValue);
        return found?.inputDisplay as string | undefined;
      },
      [categoryOptions]
    );

    const onConfirmClicked = useCallback(async () => {
      if (isSubmitting) {
        return;
      }
      setIsSubmitAttempted(true);

      if (Object.values(getValidationErrors(editingIntegration)).some(Boolean)) {
        // Wazuh: `isEditMode` means "the fields are editable", and the create flows
        // (CreateIntegration, CreateIntegrationFlyout) pass it as true, so it cannot tell which
        // action is being attempted. An integration that has no id yet is being created.
        errorNotificationToast(
          notifications,
          editingIntegration.id ? 'update' : 'create',
          'integration',
          'Fix the marked errors.'
        );
        return;
      }
      setIsSubmitting(true);
      try {
        await onConfirm(editingIntegration);
      } finally {
        setIsSubmitting(false);
      }
    }, [editingIntegration, notifications, onConfirm, isSubmitting]);

    const onCancelClicked = useCallback(() => {
      setEditingIntegration(integrationDetails);
      setTouchedFields(untouchedFields);
      setIsSubmitAttempted(false);
      onCancel();
    }, [integrationDetails, onCancel]);

    useImperativeHandle(ref, () => ({ submit: onConfirmClicked }), [onConfirmClicked]);

    const missingFields: string[] = [];
    if (!editingIntegration.document.metadata?.title) missingFields.push('Title');
    if (!editingIntegration.document.category) missingFields.push('Category');
    if (!editingIntegration.document.metadata?.author) missingFields.push('Author');
    const isSubmitDisabled = missingFields.length > 0;

    return (
      <>
        <div style={{ paddingBottom: isEditMode && !hideBottomBar ? '60px' : '0' }}>
          <EuiCompressedFormRow
            label="Title"
            helpText={
              isEditMode &&
              'Must contain 2-50 characters. Valid characters are a-z, 0-9, hyphens, and underscores'
            }
            isInvalid={!!titleError}
            error={titleError}
          >
            {isEditMode ? (
              <EuiCompressedFieldText
                value={editingIntegration?.document.metadata?.title}
                onChange={(e) => {
                  const newIntegration = {
                    ...editingIntegration!,
                    document: {
                      ...editingIntegration!.document,
                      metadata: {
                        ...editingIntegration!.document.metadata,
                        title: e.target.value,
                      },
                    },
                  };
                  setEditingIntegration(newIntegration);
                }}
                onBlur={() => markTouched('title')}
                disabled={!!integrationDetails.detectionRulesCount}
                data-test-subj="integration_title_field"
              />
            ) : (
              <ReadOnlyField value={integrationDetails?.document.metadata?.title} />
            )}
          </EuiCompressedFormRow>
          <EuiSpacer />
          <EuiCompressedFormRow label="Category" isInvalid={!!categoryError} error={categoryError}>
            {isEditMode ? (
              <EuiCompressedSuperSelect
                options={categoryOptionsWithDisabled}
                value={editingIntegration?.document.category}
                onChange={(value) => {
                  const newIntegration = {
                    ...editingIntegration!,
                    document: {
                      ...editingIntegration!.document,
                      category: value,
                    },
                  };
                  setEditingIntegration(newIntegration);
                }}
                onBlur={(event: React.FocusEvent<HTMLButtonElement>) => {
                  // Focus moving into the open option list is not leaving the field: marking it
                  // there would flash the error while an option is being clicked.
                  const nextFocus = event.relatedTarget as HTMLElement | null;
                  if (!nextFocus?.closest?.('[role="listbox"]')) {
                    markTouched('category');
                  }
                }}
                disabled={!!integrationDetails.detectionRulesCount}
                data-test-subj="integration_category_select"
              />
            ) : (
              <ReadOnlyField value={getCategoryLabel(integrationDetails?.document.category)} />
            )}
          </EuiCompressedFormRow>
          <EuiCompressedFormRow
            label="Author"
            helpText={isEditMode && 'Must contain 2-50 characters.'}
            isInvalid={!!authorError}
            error={authorError}
          >
            {isEditMode ? (
              <EuiCompressedFieldText
                value={editingIntegration?.document.metadata?.author}
                onChange={(e) => {
                  const newIntegration = {
                    ...editingIntegration!,
                    document: {
                      ...editingIntegration!.document,
                      metadata: {
                        ...editingIntegration!.document.metadata,
                        author: e.target.value,
                      },
                    },
                  };
                  setEditingIntegration(newIntegration);
                }}
                onBlur={() => markTouched('author')}
                disabled={!!integrationDetails.detectionRulesCount}
                data-test-subj="integration_author_field"
              />
            ) : (
              <ReadOnlyField value={integrationDetails?.document.metadata?.author} />
            )}
          </EuiCompressedFormRow>
          {showEnabledField ? (
            <>
              <EuiSpacer />
              <EuiCompressedFormRow label="Enabled">
                <EuiCompressedSwitch
                  label={editingIntegration?.document.enabled === true ? 'Enabled' : 'Disabled'}
                  checked={editingIntegration?.document.enabled === true}
                  onChange={(e) => {
                    const newIntegration = {
                      ...editingIntegration!,
                      document: {
                        ...editingIntegration!.document,
                        enabled: e.target.checked,
                      },
                    };
                    setEditingIntegration(newIntegration);
                  }}
                  data-test-subj="integration_enabled_toggle"
                />
              </EuiCompressedFormRow>
              <EuiSpacer />
            </>
          ) : (
            <EuiSpacer />
          )}
          <EuiCompressedFormRow label="Mode">
            <ReadOnlyField value={integrationDetails?.document.mode} />
          </EuiCompressedFormRow>
          <EuiSpacer />
          <EuiCompressedFormRow
            label={
              isEditMode ? (
                <>
                  {'Description - '}
                  <em>optional</em>
                </>
              ) : (
                'Description'
              )
            }
            fullWidth={!isEditMode}
          >
            {isEditMode ? (
              <EuiCompressedTextArea
                value={editingIntegration?.document?.metadata?.description}
                onChange={(e) => {
                  const newIntegration = {
                    ...editingIntegration!,
                    document: {
                      ...editingIntegration!.document,
                      metadata: {
                        ...editingIntegration!.document.metadata,
                        description: e.target.value,
                      },
                    },
                  };
                  setEditingIntegration(newIntegration);
                }}
                placeholder="Description of the integration"
              />
            ) : (
              <ReadOnlyField
                value={integrationDetails?.document?.metadata?.description}
                isTextArea
              />
            )}
          </EuiCompressedFormRow>
          <EuiSpacer />
          <EuiCompressedFormRow
            label={
              isEditMode ? (
                <>
                  {'Documentation - '}
                  <em>optional</em>
                </>
              ) : (
                'Documentation'
              )
            }
            helpText={isEditMode && 'Must contain 2-100 characters.'}
            fullWidth={!isEditMode}
          >
            {isEditMode ? (
              <EuiCompressedTextArea
                value={editingIntegration?.document.metadata?.documentation}
                onChange={(e) => {
                  const newIntegration = {
                    ...editingIntegration!,
                    document: {
                      ...editingIntegration!.document,
                      metadata: {
                        ...editingIntegration!.document.metadata,
                        documentation: e.target.value,
                      },
                    },
                  };
                  setEditingIntegration(newIntegration);
                }}
                disabled={!!integrationDetails.detectionRulesCount}
                placeholder="Documentation of the integration"
              />
            ) : (
              <ReadOnlyField
                value={integrationDetails?.document.metadata?.documentation}
                noTruncate
              />
            )}
          </EuiCompressedFormRow>
          <EuiSpacer />
          {isEditMode ? (
            <FormFieldArray
              label={
                <>
                  {'References - '}
                  <em>optional</em>
                </>
              }
              values={editingIntegration?.document?.metadata?.references || []}
              placeholder="https://example.com/reference"
              readOnly={false}
              addButtonLabel="Add reference"
              onChange={(references) => {
                const newIntegration = {
                  ...editingIntegration!,
                  document: {
                    ...editingIntegration!.document,
                    metadata: {
                      ...editingIntegration!.document.metadata,
                      references,
                    },
                  },
                };
                setEditingIntegration(newIntegration);
              }}
            />
          ) : (
            integrationDetails?.document?.metadata?.references?.length > 0 && (
              <>
                <EuiCompressedFormRow label="References">
                  <EuiText size="s">
                    <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
                      {integrationDetails.document.metadata.references.map(
                        (ref: string, index: number) => (
                          <li key={index}>{ref || '-'}</li>
                        )
                      )}
                    </ul>
                  </EuiText>
                </EuiCompressedFormRow>
                <EuiSpacer />
              </>
            )
          )}
          {isEditMode ? (
            <FormFieldArray
              label={
                <>
                  {'Supports - '}
                  <em>optional</em>
                </>
              }
              values={editingIntegration?.document?.metadata?.supports || []}
              readOnly={false}
              addButtonLabel="Add support"
              onChange={(supports) => {
                const newIntegration = {
                  ...editingIntegration!,
                  document: {
                    ...editingIntegration!.document,
                    metadata: {
                      ...editingIntegration!.document.metadata,
                      supports,
                    },
                  },
                };
                setEditingIntegration(newIntegration);
              }}
            />
          ) : (
            (integrationDetails?.document?.metadata?.supports?.length ?? 0) > 0 && (
              <>
                <EuiCompressedFormRow label="Supports">
                  <EuiText size="s">
                    <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
                      {integrationDetails.document.metadata.supports.map(
                        (entry: string, index: number) => (
                          <li key={index}>{entry || '-'}</li>
                        )
                      )}
                    </ul>
                  </EuiText>
                </EuiCompressedFormRow>
                <EuiSpacer />
              </>
            )
          )}
        </div>
        {isEditMode && !hideBottomBar ? (
          <EuiBottomBar>
            <EuiFlexGroup
              gutterSize="s"
              justifyContent="flexEnd"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="ghost"
                  size="s"
                  iconType="cross"
                  onClick={onCancelClicked}
                  isDisabled={isSubmitting}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    isSubmitDisabled && missingFields.length > 0 ? (
                      <span>
                        Complete the following required fields: {missingFields.join(', ')}
                      </span>
                    ) : undefined
                  }
                  position="top"
                  delay="regular"
                  display="block"
                >
                  <EuiButton
                    color="primary"
                    fill
                    iconType="check"
                    size="s"
                    onClick={onConfirmClicked}
                    disabled={isSubmitDisabled}
                    isLoading={isSubmitting}
                  >
                    {confirmButtonText}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        ) : null}
      </>
    );
  }
);
