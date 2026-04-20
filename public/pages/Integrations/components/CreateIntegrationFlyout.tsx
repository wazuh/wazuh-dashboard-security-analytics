/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { IntegrationItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { successNotificationToast } from '../../../utils/helpers';
import { IntegrationForm, IntegrationFormHandle } from './IntegrationForm';
import { defaultIntegration } from '../utils/constants';

export interface CreateIntegrationFlyoutProps {
  notifications: NotificationsStart;
  onClose: () => void;
  /** Called with the new integration's id and title after a successful creation */
  onSuccess: (id: string, title: string) => void;
}

export const CreateIntegrationFlyout: React.FC<CreateIntegrationFlyoutProps> = ({
  notifications,
  onClose,
  onSuccess,
}) => {
  const formRef = useRef<IntegrationFormHandle>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onConfirm = useCallback(
    async (integrationData: IntegrationItem) => {
      setIsSaving(true);
      try {
        const id = await DataStore.integrations.createIntegration(integrationData);
        if (id) {
          const title = integrationData.document.metadata?.title ?? '';
          successNotificationToast(notifications, 'created', `integration ${title}`);
          onSuccess(id, title);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [notifications, onSuccess]
  );

  const emptyIntegration: IntegrationItem = {
    ...defaultIntegration,
    id: '',
    detectionRulesCount: 0,
    decodersCount: 0,
    kvdbsCount: 0,
  };

  return (
    <EuiFlyout onClose={onClose} ownFocus size="m" maxWidth={600}>
      <EuiFlyoutHeader hasBorder>
        <EuiText size="s">
          <h2>Create integration</h2>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <IntegrationForm
          ref={formRef}
          integrationDetails={emptyIntegration}
          isEditMode={true}
          hideBottomBar={true}
          confirmButtonText="Create integration"
          notifications={notifications}
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              onClick={() => formRef.current?.submit()}
            >
              Create integration
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
