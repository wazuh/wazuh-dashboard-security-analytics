/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  EuiSmallButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
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
import { SpaceSelector } from '../../../components/SpaceSelector/SpaceSelector';
import { SpaceTypes } from '../../../../common/constants';

export interface IntegrationsProps extends RouteComponentProps, DataSourceProps {
  notifications: NotificationsStart;
}

export const Integrations: React.FC<IntegrationsProps> = ({ history, notifications, dataSource }) => {
  const isMountedRef = useRef(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationToDelete, setIntegrationItemToDelete] = useState<Integration | undefined>(undefined);
  const [spaceFilter, setSpaceFilter] = useState<string>(SpaceTypes.STANDARD.value);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Integration[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [deletionDetails, setDeletionDetails] = useState<
    { detectionRulesCount: number } | undefined
  >(undefined);
  const getIntegrations = async () => {
    const integrations = await DataStore.integrations.getIntegrations(spaceFilter);
    const policies = await DataStore.policies.searchPolicies(spaceFilter);
    setIntegrations(integrations);
  };

  const deleteIntegration = async (id: string) => {
    const deleteSucceeded = await DataStore.integrations.deleteIntegration(id);
    if (deleteSucceeded) {
      successNotificationToast(notifications, 'deleted', 'integration');
      getIntegrations();
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  setBreadcrumbs([BREADCRUMBS.INTEGRATIONS]);

  const spaceSelector = (
    <SpaceSelector
      selectedSpace={spaceFilter}
      onSpaceChange={(id) => {
        setSpaceFilter(id);
      }}
    />
  );

  const panels = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.INTEGRATIONS_CREATE}`}
      disabled={spaceFilter !== SpaceTypes.DRAFT.value}
      toolTipContent={
        spaceFilter !== SpaceTypes.DRAFT.value
          ? 'Integration can only be created in the draft space.'
          : undefined
      }
    >
      Create
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="promote"
      icon="share"
      onClick={() => {}}
      disabled={![SpaceTypes.DRAFT.value, SpaceTypes.TESTING.value].includes(spaceFilter)}
      toolTipContent={
        ![SpaceTypes.DRAFT.value, SpaceTypes.TESTING.value].includes(spaceFilter)
          ? 'Integration can only be promoted in the draft or testing space.'
          : undefined
      }
    >
      Promote
    </EuiContextMenuItem>,
  ];

  const handlerShowActionsButton = () => setIsPopoverOpen((prevState) => !prevState);

  const actionsButton = (
    <EuiPopover
      id={'integrationsActionsPopover'}
      button={
        <EuiSmallButton
          iconType={'arrowDown'}
          iconSide={'right'}
          onClick={handlerShowActionsButton}
          data-test-subj={'integrationsActionsButton'}
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isPopoverOpen}
      closePopover={handlerShowActionsButton}
      panelPaddingSize={'none'}
      anchorPosition={'downLeft'}
      data-test-subj={'integrationsActionsPopover'}
    >
      <EuiContextMenuPanel items={panels} size="s" />
    </EuiPopover>
  );

  useEffect(() => {
    getIntegrations();
  }, [dataSource]);


  const loadIntegrations = useCallback(async () => {
    setLoading(true);

    const response = await DataStore.integrations.getIntegrations(
      spaceFilter
    );

    if (!isMountedRef.current) {
      return;
    }
    setIntegrations(response);
    setLoading(false);
  }, [spaceFilter]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);


  const onSelectionChange = (selectedItems: Integration[]) => {
    setSelectedItems(selectedItems);
  };

  const showIntegrationDetails = useCallback((id: string) => {
    history.push(`${ROUTES.INTEGRATIONS}/${id}`);
  }, []);

  const onDeleteClick = async (item: Integration) => {
    setIntegrationItemToDelete(item);
    const rules = await DataStore.rules.getAllRules({
      'rule.category': [item.id],
    });
    setDeletionDetails({ detectionRulesCount: rules.length });
  };

  const onPromoteClick = async (item: Integration) => {
    setIntegrationItemToDelete(item);
    const rules = await DataStore.integrations.promoteIntegration(item.id);
    setDeletionDetails({ detectionRulesCount: rules.length });
  };

  const createIntegrationAction = (
    <EuiSmallButton fill={true} onClick={() => history.push(ROUTES.INTEGRATIONS_CREATE)}>
      Create integration
    </EuiSmallButton>
  );

  return (
    <>
      {integrationToDelete && (
        <DeleteIntegrationModal
          integrationName={integrationToDelete.document.title}
          detectionRulesCount={deletionDetails?.detectionRulesCount || 0}
          loading={!deletionDetails}
          closeModal={() => setIntegrationItemToDelete(undefined)}
          onConfirm={() => deleteIntegration(integrationToDelete.id)}
        />
      )}

      <PageHeader appRightControls={[{ renderComponent: createIntegrationAction }]}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent={'spaceBetween'}>
            <EuiFlexItem>
              <EuiText size="s">
                <h1>Integrations</h1>
              </EuiText>
              <EuiText size="s" color="subdued">
                Integrations describe the data sources to which the detection rules are meant to be
                applied.
              </EuiText>
            </EuiFlexItem>
            {/* <EuiFlexItem grow={false}>{createIntegrationAction}</EuiFlexItem> */}
            <EuiFlexItem grow={false}>{spaceSelector}</EuiFlexItem>
            <EuiFlexItem grow={false}>{actionsButton}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size={'m'} />
        </EuiFlexItem>
      </PageHeader>
      <EuiPanel>
        <EuiInMemoryTable
          items={integrations}
          columns={getIntegrationsTableColumns(showIntegrationDetails, onDeleteClick, onPromoteClick)}
          pagination={{
            initialPageSize: 25,
          }}
          search={getIntegrationsTableSearchConfig()}
          selection={{ onSelectionChange: onSelectionChange }}
          isSelectable={true}
          sorting={true}
          loading={loading}
        />
      </EuiPanel>
    </>
  );
};
