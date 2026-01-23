/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import { IntegrationForm } from '../components/IntegrationForm';
import { IntegrationBase } from '../../../../types';
import { defaultIntegration } from '../utils/constants';
import { RouteComponentProps } from 'react-router-dom';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { useEffect } from 'react';
import { DataStore } from '../../../store/DataStore';
import { setBreadcrumbs, successNotificationToast } from '../../../utils/helpers';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { getUseUpdatedUx } from '../../../services/utils/constants';

export interface CreateIntegrationProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

export const CreateIntegration: React.FC<CreateIntegrationProps> = ({ history, notifications }) => {
  const [integrationDetails, setIntegrationDetails] = useState<IntegrationBase>({ ...defaultIntegration });

  useEffect(() => {
    if (getUseUpdatedUx()) {
      setBreadcrumbs([BREADCRUMBS.LOG_TYPES, BREADCRUMBS.LOG_TYPE_CREATE]);
    } else {
      setBreadcrumbs([BREADCRUMBS.DETECTION, BREADCRUMBS.DETECTORS, BREADCRUMBS.LOG_TYPES, BREADCRUMBS.LOG_TYPE_CREATE]);
    }
  }, [getUseUpdatedUx()]);

  const description =
    'Create integration to categorize and identify detection rules for your data sources.'; // Replace Log Type is replaced with Integration by Wazuh

  return (
    <EuiPanel>
      <PageHeader appDescriptionControls={[{ description }]}>
        <EuiText size="s">
          {/* Log Type is replaced with Integration by Wazuh */}
          <h1>Create integration</h1>
        </EuiText>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
        <EuiSpacer />
      </PageHeader>
      <IntegrationForm
        integrationDetails={{ ...integrationDetails, id: '', detectionRulesCount: 0 }}
        isEditMode={true}
        confirmButtonText={'Create integration'} // Replace Log Type to Integration by Wazuh
        notifications={notifications}
        setIntegrationDetails={setIntegrationDetails}
        onCancel={() => history.push(ROUTES.LOG_TYPES)}
        onConfirm={async () => {
          const success = await DataStore.integrations.createIntegration(integrationDetails);
          if (success) {
            successNotificationToast(notifications, 'created', `integration ${integrationDetails.name}`); // Replace Log Type to Integration by Wazuh
            history.push(ROUTES.LOG_TYPES);
          }
        }}
      />
    </EuiPanel>
  );
};
