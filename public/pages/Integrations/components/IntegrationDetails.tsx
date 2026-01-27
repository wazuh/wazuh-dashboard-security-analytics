/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EuiSmallButton, EuiDescriptionList } from '@elastic/eui';
import { ContentPanel } from '../../../components/ContentPanel';
import React from 'react';
import { IntegrationItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { IntegrationForm } from './IntegrationForm';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { successNotificationToast } from '../../../utils/helpers';

export interface IntegrationDetailsProps {
  initialIntegrationDetails: IntegrationItem;
  integrationDetails: IntegrationItem;
  isEditMode: boolean;
  notifications: NotificationsStart;
  setIsEditMode: (isEdit: boolean) => void;
  setIntegrationDetails: (integration: IntegrationItem) => void;
}

export const IntegrationDetails: React.FC<IntegrationDetailsProps> = ({
  initialIntegrationDetails,
  integrationDetails,
  isEditMode,
  notifications,
  setIsEditMode,
  setIntegrationDetails,
}) => {
  const onUpdateIntegration = async () => {
    const success = await DataStore.integrations.updateIntegration(integrationDetails);
    if (success) {
      // Replace Log Type to Integration by Wazuh
      successNotificationToast(notifications, 'updated', `integration ${integrationDetails.document.title}`);
      setIsEditMode(false);
    }
  };

  return (
    <ContentPanel
      title="Details"
      actions={
        !isEditMode &&
        integrationDetails.space.name.toLocaleLowerCase() !== 'standard' && [
          <EuiSmallButton onClick={() => setIsEditMode(true)}>Edit</EuiSmallButton>,
        ]
      }
    >
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'Integration', // Replace Log type to Integration by Wazuh
            description: (
              <IntegrationForm
                integrationDetails={integrationDetails}
                isEditMode={isEditMode}
                confirmButtonText={'Update'}
                notifications={notifications}
                setIntegrationDetails={setIntegrationDetails}
                onCancel={() => {
                  setIntegrationDetails(initialIntegrationDetails);
                  setIsEditMode(false);
                }}
                onConfirm={onUpdateIntegration}
              />
            ),
          },
        ]}
      />
    </ContentPanel>
  );
};
