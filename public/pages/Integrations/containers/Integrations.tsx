/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import {
  EuiSmallButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { DataSourceProps, Integration } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { getIntegrationsTableColumns, getIntegrationsTableSearchConfig } from '../utils/helpers';
import { RouteComponentProps } from 'react-router-dom';
import { useCallback } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { setBreadcrumbs, successNotificationToast } from '../../../utils/helpers';
import { DeleteIntegrationModal } from '../components/DeleteIntegrationModal';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { getUseUpdatedUx } from '../../../services/utils/constants';

export interface IntegrationsProps extends RouteComponentProps, DataSourceProps {
  notifications: NotificationsStart;
}

export const Integrations: React.FC<IntegrationsProps> = ({ history, notifications, dataSource }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationToDelete, setIntegrationItemToDelete] = useState<Integration | undefined>(undefined);
  const [deletionDetails, setDeletionDetails] = useState<
    { detectionRulesCount: number } | undefined
  >(undefined);
  const getIntegrations = async () => {
    const integrations = await DataStore.integrations.getIntegrations();
    setIntegrations(integrations);
  };

  const deleteIntegration = async (id: string) => {
    const deleteSucceeded = await DataStore.integrations.deleteIntegration(id);
    if (deleteSucceeded) {
      // Replace Log Type to Integration by Wazuh
      successNotificationToast(notifications, 'deleted', 'integration');
      getIntegrations();
    }
  };

  useEffect(() => {
    if (getUseUpdatedUx()) {
      setBreadcrumbs([BREADCRUMBS.LOG_TYPES]);
    } else {
      setBreadcrumbs([BREADCRUMBS.DETECTION, BREADCRUMBS.DETECTORS, BREADCRUMBS.LOG_TYPES]);
    }
  }, [getUseUpdatedUx()]);

  useEffect(() => {
    getIntegrations();
  }, [dataSource]);

  const showIntegrationDetails = useCallback((id: string) => {
    history.push(`${ROUTES.LOG_TYPES}/${id}`);
  }, []);

  const onDeleteClick = async (item: Integration) => {
    setIntegrationItemToDelete(item);
    const rules = await DataStore.rules.getAllRules({
      'rule.category': [item.id],
    });
    setDeletionDetails({ detectionRulesCount: rules.length });
  };

  // Replace Log Type to Integration by Wazuh
  const createIntegrationAction = (
    <EuiSmallButton fill={true} onClick={() => history.push(ROUTES.LOG_TYPES_CREATE)}>
      Create integration
    </EuiSmallButton>
  );

  return (
    <>
      {integrationToDelete && (
        <DeleteIntegrationModal
          integrationName={integrationToDelete.name}
          detectionRulesCount={deletionDetails?.detectionRulesCount || 0}
          loading={!deletionDetails}
          closeModal={() => setIntegrationItemToDelete(undefined)}
          onConfirm={() => deleteIntegration(integrationToDelete.id)}
        />
      )}

      <EuiPanel>
        <PageHeader appRightControls={[{ renderComponent: createIntegrationAction }]}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize={'s'} justifyContent={'spaceBetween'}>
              <EuiFlexItem>
                <EuiText size="s">
                  {/* Replace Log Types to Integrations by Wazuh */}
                  <h1>Integrations</h1>
                </EuiText>
                <EuiText size="s" color="subdued">
                  Integrations describe the data sources to which the detection rules are meant to be
                  applied.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{createIntegrationAction}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size={'m'} />
          </EuiFlexItem>
        </PageHeader>
        <EuiInMemoryTable
          items={integrations}
          columns={getIntegrationsTableColumns(showIntegrationDetails, onDeleteClick)}
          pagination={{
            initialPageSize: 25,
          }}
          search={getIntegrationsTableSearchConfig()}
          sorting={true}
        />
      </EuiPanel>
    </>
  );
};
