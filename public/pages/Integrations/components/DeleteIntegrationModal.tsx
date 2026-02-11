/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import {
  EuiSmallButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiCompressedFieldText,
  EuiForm,
  EuiCompressedFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { useState } from 'react';
import { withGuardAsync } from '../utils/helpers';
import { DataStore } from '../../../store/DataStore';

export interface DeleteIntegrationModalProps {
  integrationName: string;
  detectionRulesCount: number;
  loading?: boolean;
  closeModal: () => void;
  onConfirm: () => void;
}

const LoadingModal = ({closeModal}) => (
  <EuiOverlayMask>
    <EuiModal onClose={closeModal}>
      <EuiLoadingSpinner size="l" />
    </EuiModal>
  </EuiOverlayMask>
)

export const DeleteIntegrationModal: React.FC<DeleteIntegrationModalProps> = withGuardAsync(
  ({integrationID}) => {
    return DataStore.rules.getAllRules({
      'rule.category': [integrationID],
    }).then(response => ({ ok: false, data: {detectionRulesCount: response.length}}))
}, null, LoadingModal)(({
  detectionRulesCount,
  integrationName,
  closeModal,
  onConfirm,
}) => {
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  const onConfirmClick = async () => {
    await onConfirm();
    closeModal();
  };

  return (
    <EuiOverlayMask>
      {detectionRulesCount > 0 ? (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <EuiText size="s">
                {/* log type replaced by integration */}
                <h2>This integration can't be deleted</h2>
              </EuiText>
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCallOut
              size="s"
              title={`This integration is associated with ${detectionRulesCount} detection ${
                detectionRulesCount > 1 ? 'rules' : 'rule'
              }.`}
              iconType={'iInCircle'}
              color="warning"
            />
            <EuiSpacer />
            <EuiText size="s">
              <p>
                Only integrations that don’t have any associated rules can be deleted. Consider editing
                integration or deleting associated detection rules.
              </p>
            </EuiText>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiSmallButton onClick={closeModal} fill>
              Close
            </EuiSmallButton>
          </EuiModalFooter>
        </EuiModal>
      ) : (
        <EuiConfirmModal
          title={<EuiText size="s"><h2>Delete integration?</h2></EuiText>}
          onCancel={closeModal}
          onConfirm={onConfirmClick}
          cancelButtonText={'Cancel'}
          confirmButtonText={`Delete integration`}
          buttonColor={'danger'}
          defaultFocusedButton="confirm"
          confirmButtonDisabled={confirmDeleteText != integrationName}
        >
          <EuiForm>
            <p>
              <EuiText size="s">
                The integration will be permanently deleted. This action is irreversible.
              </EuiText>
            </p>
            <EuiSpacer size="s"/>
              <p style={{marginBottom: '0.3rem'}}>
                <EuiText size="s">
                  Type {<b>{integrationName}</b>} to confirm
                </EuiText>
              </p>

            <EuiCompressedFormRow>
              <EuiCompressedFieldText
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
              />
            </EuiCompressedFormRow>
          </EuiForm>
        </EuiConfirmModal>
      )}
    </EuiOverlayMask>
  );
});
