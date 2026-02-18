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
  EuiConfirmModal,
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
import { AllowedActionsBySpace, SPACE_ACTIONS, SpaceTypes } from '../../../../common/constants';
import { PolicyInfoCard } from '../components/PolicyInfo';

export interface IntegrationsProps extends RouteComponentProps, DataSourceProps {
  notifications: NotificationsStart;
}

export const Integrations: React.FC<IntegrationsProps> = ({
  history,
  notifications,
  dataSource,
}) => {
  const isMountedRef = useRef(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [spaceFilter, setSpaceFilter] = useState<string>(SpaceTypes.STANDARD.value);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Integration[]>([]);
  const [itemForAction, setItemForAction] = useState<{
    item: Integration;
    action: typeof SPACE_ACTIONS.DELETE;
  } | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isDeleteSelectedModalVisible, setIsDeleteSelectedModalVisible] = useState(false);
  const loadIntegrations = useCallback(async () => {
    setLoading(true);

    const response = await DataStore.integrations.getIntegrations(spaceFilter);

    if (!isMountedRef.current) {
      return;
    }
    setIntegrations(response);
    setLoading(false);
  }, [spaceFilter, dataSource]);

  const deleteIntegration = async (id: string) => {
    const deleteSucceeded = await DataStore.integrations.deleteIntegration(id);
    if (deleteSucceeded) {
      successNotificationToast(notifications, 'deleted', 'integration');
      loadIntegrations();
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
        setSelectedItems([]);
      }}
    />
  );

  const isCreateActionDisabled = !AllowedActionsBySpace[
    SpaceTypes[spaceFilter.toUpperCase()].value
  ].includes(SPACE_ACTIONS.CREATE);
  const isPromoteActionDisabled = !AllowedActionsBySpace[
    SpaceTypes[spaceFilter.toUpperCase()].value
  ].includes(SPACE_ACTIONS.PROMOTE);
  const isDeleteActionDisabledBySpace = !AllowedActionsBySpace[
    SpaceTypes[spaceFilter.toUpperCase()].value
  ].includes(SPACE_ACTIONS.DELETE);

  const getRulesCount = (item: Integration): number => {
    const rules = (item as any)?.rules;
    return Array.isArray(rules) ? rules.length : 0;
  };

  const selectedItemsWithoutRules = selectedItems.filter((item) => getRulesCount(item) === 0);
  const selectedItemsWithRulesCount = selectedItems.length - selectedItemsWithoutRules.length;
  const isDeleteSelectedActionDisabled =
    isDeleteActionDisabledBySpace ||
    selectedItems.length === 0 ||
    selectedItemsWithoutRules.length === 0;

  const deleteSelectedIntegrations = useCallback(async () => {
    if (selectedItemsWithoutRules.length === 0) return;
    setLoading(true);
    setIsDeleteSelectedModalVisible(false);

    try {
      const deleteResults = await Promise.all(
        selectedItemsWithoutRules.map((item) => DataStore.integrations.deleteIntegration(item.id))
      );
      const deletedCount = deleteResults.filter(Boolean).length;
      const failedCount = deleteResults.length - deletedCount;

      if (deletedCount > 0) {
        successNotificationToast(
          notifications,
          'deleted',
          deletedCount === 1 ? 'integration' : 'integrations'
        );
      }

      if (failedCount > 0) {
        notifications.toasts.addWarning({
          title: 'Some integrations could not be deleted',
          text: `${failedCount} integration${failedCount !== 1 ? 's' : ''} could not be deleted.`,
          toastLifeTimeMs: 5000,
        });
      }

      if (selectedItemsWithRulesCount > 0) {
        notifications.toasts.addWarning({
          title: 'Some integrations were skipped',
          text: `${selectedItemsWithRulesCount} integration${
            selectedItemsWithRulesCount !== 1 ? 's were' : ' was'
          } not deleted because ${
            selectedItemsWithRulesCount !== 1 ? 'they have' : 'it has'
          } associated detection rules.`,
          toastLifeTimeMs: 5000,
        });
      }

      await loadIntegrations();
      if (isMountedRef.current) {
        setSelectedItems([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedItemsWithoutRules, selectedItemsWithRulesCount, loadIntegrations, notifications]);

  const panels = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.INTEGRATIONS_CREATE}`}
      disabled={isCreateActionDisabled}
      toolTipContent={
        isCreateActionDisabled ? 'Integration can only be created in the draft space.' : undefined
      }
    >
      Create
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="promote"
      icon="share"
      onClick={() => {
        history.push({
          pathname: `${ROUTES.PROMOTE}`,
          search: `?space=${spaceFilter}`,
        });
      }}
      disabled={isPromoteActionDisabled}
      toolTipContent={
        isPromoteActionDisabled
          ? 'Integration can only be promoted in the draft or testing space.'
          : undefined
      }
    >
      Promote
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      onClick={() => {
        setIsDeleteSelectedModalVisible(true);
        setIsPopoverOpen(false);
      }}
      disabled={isDeleteSelectedActionDisabled}
      toolTipContent={
        isDeleteActionDisabledBySpace
          ? 'Integrations can only be deleted in the draft space.'
          : selectedItems.length === 0
          ? 'Select integrations to delete.'
          : selectedItemsWithoutRules.length === 0
          ? 'Only integrations without associated detection rules can be deleted.'
          : selectedItemsWithRulesCount > 0
          ? `${selectedItemsWithRulesCount} selected integration${
              selectedItemsWithRulesCount !== 1 ? 's have' : ' has'
            } associated detection rules and will be skipped.`
          : undefined
      }
    >
      Delete selected ({selectedItems.length})
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
    loadIntegrations();
  }, [loadIntegrations]);

  const onSelectionChange = (selectedItems: Integration[]) => {
    setSelectedItems(selectedItems);
  };

  const showIntegrationDetails = useCallback((id: string) => {
    history.push(`${ROUTES.INTEGRATIONS}/${id}`);
  }, []);

  const createIntegrationAction = (
    <EuiSmallButton fill={true} onClick={() => history.push(ROUTES.INTEGRATIONS_CREATE)}>
      Create integration
    </EuiSmallButton>
  );

  return (
    <>
      {itemForAction && (
        <>
          {itemForAction.action === SPACE_ACTIONS.DELETE && (
            <DeleteIntegrationModal
              integrationID={itemForAction.item.title}
              integrationName={itemForAction.item.title}
              closeModal={() => setItemForAction(null)}
              onConfirm={() => deleteIntegration(itemForAction.item.id)}
            />
          )}
        </>
      )}
      {isDeleteSelectedModalVisible && (
        <EuiConfirmModal
          title={`Delete ${selectedItemsWithoutRules.length} integration${
            selectedItemsWithoutRules.length !== 1 ? 's' : ''
          }`}
          onCancel={() => setIsDeleteSelectedModalVisible(false)}
          onConfirm={deleteSelectedIntegrations}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <p>
            {`Are you sure you want to delete ${selectedItemsWithoutRules.length} integration${
              selectedItemsWithoutRules.length !== 1 ? 's' : ''
            }? This action cannot be undone.`}
          </p>
          {selectedItemsWithRulesCount > 0 && (
            <p>
              {`${selectedItemsWithRulesCount} selected integration${
                selectedItemsWithRulesCount !== 1 ? 's have' : ' has'
              } associated detection rules and will be skipped.`}
            </p>
          )}
        </EuiConfirmModal>
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
              <EuiSpacer size="s"></EuiSpacer>
              <PolicyInfoCard space={spaceFilter} notifications={notifications} />
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
          itemId={'id'}
          items={integrations}
          columns={getIntegrationsTableColumns({
            showDetails: showIntegrationDetails,
            setItemForAction,
          })}
          pagination={{
            initialPageSize: 25,
          }}
          search={getIntegrationsTableSearchConfig()}
          selection={{
            onSelectionChange: onSelectionChange,
            initialSelected: [],
          }}
          isSelectable={true}
          sorting={true}
          loading={loading}
        />
      </EuiPanel>
    </>
  );
};
