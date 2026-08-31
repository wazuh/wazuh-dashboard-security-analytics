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
  EuiSpacer,
  EuiText,
  EuiCard,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiConfirmModal,
  EuiTab,
  EuiTabs,
  EuiSearchBar,
} from '@elastic/eui';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { OVERVIEW_TAB, OverviewTabId } from '../utils/constants';
import { DataSourceProps, PromoteSpaces } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import {
  getIntegrationsTableColumns,
  getIntegrationsTableSearchConfig,
  IntegrationTableItem,
  mapPolicyToIntegrationTableItems,
  hasRelatedEntity,
} from '../utils/helpers';
import { RouteComponentProps } from 'react-router-dom';
import { useCallback } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { setBreadcrumbs, successNotificationToast } from '../../../utils/helpers';
import { DeleteIntegrationModal } from '../components/DeleteIntegrationModal';
import { WazuhPageHeader } from '../../../components/WazuhPageHeader';
import { SPACE_ACTIONS, SpaceTypes } from '../../../../common/constants';
import { PolicyInfoCard } from '../components/PolicyInfoCard';
import {
  actionIsAllowedOnSpace,
  getNextSpace,
  getSpacesAllowAction,
} from '../../../../common/helpers';
import { RearrangeIntegrations } from '../components/RearrangeIntegrations';
import { ListEmptyPrompt } from '../../../components/ListEmptyPrompt';
import { useSpaceSelector } from '../../../hooks/useSpaceSelector';
import { EditPolicy } from '../components/EditPolicy';
import { FiltersTab } from '../../Filters/components/FiltersTab';
import { PendingPromotionCallout } from '../components/PendingPromotionCallout';
import { RedirectAppLinks } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getApplication } from '../../../services/utils/constants';
import {
  buildQueryTextWithStatus,
  readInMemoryUrlFilterValues,
  splitStatusFromQueryText,
  writeInMemoryUrlFilterValues,
} from '../../../utils/inMemoryUrlFilterAdapter';

export interface IntegrationsProps extends RouteComponentProps, DataSourceProps {
  notifications: NotificationsStart;
}

// Wazuh: one description per tab, rendered inside the tab panel; in the page header it
// would sit above the space policy card and read as describing that.
const TAB_DESCRIPTIONS: Record<string, string> = {
  [OVERVIEW_TAB.INTEGRATIONS]:
    'An integration is the top-level unit of security analytics: it groups the decoders, rules and KVDBs that add support for one log source or use case.',
  [OVERVIEW_TAB.FILTERS]:
    'A filter checks conditions on an event without modifying it and discards the events that do not pass. Filters apply to the whole space, not to a single integration.',
};

const DELETE_SELECTED_ACTION = 'delete_selected' as const;
const CLEAR_SPACE_ACTION = 'clear_space' as const;

type ItemForAction =
  | {
      item: IntegrationTableItem;
      action: typeof SPACE_ACTIONS.DELETE;
    }
  | {
      action: typeof SPACE_ACTIONS.REARRANGE_INTEGRATIONS;
    }
  | {
      action: typeof DELETE_SELECTED_ACTION;
    }
  | {
      action: typeof CLEAR_SPACE_ACTION;
    };

export const Integrations: React.FC<IntegrationsProps> = ({
  history,
  notifications,
  dataSource,
}) => {
  const isMountedRef = useRef(true);
  const [integrations, setIntegrations] = useState<IntegrationTableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<IntegrationTableItem[]>([]);
  const [itemForAction, setItemForAction] = useState<ItemForAction | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [isOverviewActionsOpen, setIsOverviewActionsOpen] = useState<boolean>(false);
  const [isClearingSpace, setIsClearingSpace] = useState<boolean>(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  // Wazuh: query/status/category persisted in the URL (no 'page' — Integrations is an
  // in-memory table, per the no-goal boundary).
  const [urlFilters] = useState(() =>
    readInMemoryUrlFilterValues(history.location.search, ['category'])
  );
  const {
    component: spaceSelector,
    spaceFilter,
    setSpace,
  } = useSpaceSelector({
    isLoading: loading || isClearingSpace,
  });
  const [policyRefresh, setPolicyRefresh] = useState(0);
  // Wazuh: pending-promotion callout state.
  const [hasPendingPromotions, setHasPendingPromotions] = useState<boolean>(false);
  const [promotionCalloutDismissed, setPromotionCalloutDismissed] = useState<boolean>(false);
  // This trusts the changes in the history location causes a rerender in the componnet
  const selectedTab =
    history.location.pathname === ROUTES.FILTERS ? OVERVIEW_TAB.FILTERS : OVERVIEW_TAB.INTEGRATIONS;
  const pageDescription = TAB_DESCRIPTIONS[selectedTab];

  const onTabChange = (tab: OverviewTabId) => {
    const path = tab === OVERVIEW_TAB.FILTERS ? ROUTES.FILTERS : ROUTES.INTEGRATIONS;
    // Wazuh: Integrations and Filters each have their own independent meaning for
    // 'query'/'status' (e.g. status filters a different `enabled` field per tab) —
    // carrying them over on tab switch leaked one tab's filter into the other's.
    const params = new URLSearchParams(history.location.search);
    params.delete('query');
    params.delete('status');
    params.delete('category');
    const search = params.toString();
    history.replace(path + (search ? `?${search}` : ''));
  };
  const loadIntegrations = useCallback(async () => {
    setLoading(true);

    const policiesResult = await DataStore.policies.searchPolicies(spaceFilter, {
      includeIntegrationFields: [
        'document.id',
        'document.metadata.title',
        'document.category',
        'document.enabled',
        'document.mode',
        'document.rules',
        'document.decoders',
        'document.kvdbs',
        'space.name',
      ],
    });
    const policy = policiesResult.items[0];
    const integrations = mapPolicyToIntegrationTableItems(policy);

    if (!isMountedRef.current) {
      return;
    }
    setIntegrations(integrations);
    setLoading(false);
  }, [spaceFilter, dataSource]);

  const deleteIntegration = async (id: string) => {
    const { ok } = await DataStore.integrations.deleteIntegration(id);

    if (ok) {
      successNotificationToast(notifications, 'deleted', 'integration');
      await loadIntegrations();
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.INTEGRATIONS]);
  }, []);

  const isCreateActionDisabled = !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.CREATE);
  const isPromoteActionDisabled = !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.PROMOTE);
  const isDeleteActionDisabledBySpace = !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE);

  const selectedItemsWithoutRelatedEntities = selectedItems.filter(
    (item) => !item.rules && !item.decoders && !item.kvdbs
  );
  const selectedItemsWithRelatedEntities = selectedItems.filter(
    (item) => item.rules || item.decoders || item.kvdbs
  );
  const selectedItemsWithRelatedEntitiesCount = selectedItemsWithRelatedEntities.length;
  const selectedItemsRelatedEntitiesMessage = DataStore.integrations.getRelatedEntitiesMessage({
    hasRules: selectedItemsWithRelatedEntities.some((item) => hasRelatedEntity(item, 'rules')),
    hasDecoders: selectedItemsWithRelatedEntities.some((item) =>
      hasRelatedEntity(item, 'decoders')
    ),
    hasKVDBs: selectedItemsWithRelatedEntities.some((item) => hasRelatedEntity(item, 'kvdbs')),
  });

  const isDeleteSelectedActionDisabled =
    isDeleteActionDisabledBySpace ||
    selectedItems.length === 0 ||
    selectedItemsWithoutRelatedEntities.length === 0;
  const isRearrangeIntegrationsActionDisabled = !actionIsAllowedOnSpace(
    spaceFilter,
    SPACE_ACTIONS.REARRANGE_INTEGRATIONS
  );
  const canEditSpaceDetails =
    actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DEFINE_ROOT_DECODER) ||
    actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT_POLICY_ENRICHMENTS) ||
    actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT_POLICY_INDEXING_SETTINGS);
  const isEditSpaceDetailsDisabled = !canEditSpaceDetails;
  const spacesAllowingSpacePolicyEdit = Array.from(
    new Set([
      ...getSpacesAllowAction(SPACE_ACTIONS.DEFINE_ROOT_DECODER),
      ...getSpacesAllowAction(SPACE_ACTIONS.EDIT_POLICY_ENRICHMENTS),
      ...getSpacesAllowAction(SPACE_ACTIONS.EDIT_POLICY_INDEXING_SETTINGS),
    ])
  );
  const isClearSpaceDisabled = !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.CLEAR_SPACE);
  // Wazuh: promotion target of the current space, used by the pending-promotion callout.
  const pendingPromotionNextSpace = getNextSpace(spaceFilter as PromoteSpaces);

  const clearSpace = useCallback(async () => {
    setIsClearingSpace(true);
    try {
      const ok = await DataStore.policies.deleteSpace(spaceFilter);
      if (ok) {
        successNotificationToast(notifications, 'cleared', 'space');
        setPolicyRefresh((prev) => prev + 1);
        await loadIntegrations();
      }
    } finally {
      if (isMountedRef.current) {
        setIsClearingSpace(false);
        setItemForAction(null);
      }
    }
  }, [spaceFilter, loadIntegrations, notifications]);

  const onEditPolicy = () => {
    setItemForAction({ action: SPACE_ACTIONS.EDIT_POLICY });
    setIsPopoverOpen(false);
    setIsOverviewActionsOpen(false);
  };

  const deleteSelectedIntegrations = useCallback(async () => {
    setLoading(true);
    setIsDeletingSelected(true);

    try {
      const deleteResults = await Promise.all(
        selectedItemsWithoutRelatedEntities.map(async (item) => {
          const { ok } = await DataStore.integrations.deleteIntegration(item?.id);
          return ok;
        })
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

      if (selectedItemsWithRelatedEntitiesCount > 0) {
        notifications.toasts.addWarning({
          title: 'Some integrations were skipped',
          text: `${selectedItemsWithRelatedEntitiesCount} integration${
            selectedItemsWithRelatedEntitiesCount !== 1 ? 's were' : ' was'
          } not deleted because ${
            selectedItemsWithRelatedEntitiesCount !== 1 ? 'they have' : 'it has'
          } associated ${selectedItemsRelatedEntitiesMessage}.`,
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
        setIsDeletingSelected(false);
        setItemForAction(null);
      }
    }
  }, [
    selectedItemsWithoutRelatedEntities,
    selectedItemsRelatedEntitiesMessage,
    selectedItemsWithRelatedEntitiesCount,
    loadIntegrations,
    notifications,
  ]);

  const buildActionsPopOver = (
    id: string,
    isOpen: boolean,
    onToggle: () => void,
    items: React.ReactElement[]
  ) => (
    <EuiPopover
      id={id}
      button={
        <EuiSmallButton
          iconType={'arrowDown'}
          iconSide={'right'}
          onClick={onToggle}
          data-test-subj={id}
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isOpen}
      closePopover={onToggle}
      panelPaddingSize={'none'}
      anchorPosition={'downLeft'}
    >
      <EuiContextMenuPanel items={items} size="s" />
    </EuiPopover>
  );

  const overviewActionsMenuItems: React.ReactElement[] = [
    <EuiContextMenuItem
      key="edit-space"
      icon="pencil"
      onClick={onEditPolicy}
      disabled={isEditSpaceDetailsDisabled}
      toolTipContent={
        isEditSpaceDetailsDisabled
          ? `Space policy can only be edited in the spaces: ${spacesAllowingSpacePolicyEdit.join(
              ', '
            )}`
          : undefined
      }
      data-test-subj="overviewEditSpaceDetails"
    >
      Edit
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="clear-space"
      icon="trash"
      onClick={() => {
        setItemForAction({ action: CLEAR_SPACE_ACTION });
        setIsOverviewActionsOpen(false);
      }}
      disabled={isClearSpaceDisabled}
      toolTipContent={
        isClearSpaceDisabled
          ? `Clear space is only available in the spaces: ${getSpacesAllowAction(
              SPACE_ACTIONS.CLEAR_SPACE
            ).join(', ')}`
          : undefined
      }
      data-test-subj="overviewClearSpace"
    >
      Clear space
    </EuiContextMenuItem>,
  ];
  overviewActionsMenuItems.push(
    <EuiContextMenuItem
      key="promote"
      icon="share"
      onClick={() => {
        history.push({ pathname: ROUTES.PROMOTE, search: `?space=${spaceFilter}` });
        setIsOverviewActionsOpen(false);
      }}
      disabled={isPromoteActionDisabled}
      toolTipContent={
        isPromoteActionDisabled
          ? `Integrations can only be promoted in the spaces: ${getSpacesAllowAction(
              SPACE_ACTIONS.PROMOTE
            ).join(', ')}`
          : undefined
      }
    >
      Promote
    </EuiContextMenuItem>
  );

  const overviewActionsButton = buildActionsPopOver(
    'overviewActionsPopover',
    isOverviewActionsOpen,
    () => setIsOverviewActionsOpen((prev) => !prev),
    overviewActionsMenuItems
  );

  const actionsButton = buildActionsPopOver(
    'integrationsActionsPopover',
    isPopoverOpen,
    () => setIsPopoverOpen((prev) => !prev),
    [
      <EuiContextMenuItem
        key="create"
        icon="plusInCircle"
        onClick={() => {
          history.push(ROUTES.INTEGRATIONS_CREATE);
          setIsPopoverOpen(false);
        }}
        disabled={isCreateActionDisabled}
        toolTipContent={
          isCreateActionDisabled
            ? `Integrations can only be created in the spaces: ${getSpacesAllowAction(
                SPACE_ACTIONS.CREATE
              ).join(', ')}`
            : undefined
        }
      >
        Create
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        onClick={() => {
          setItemForAction({ action: DELETE_SELECTED_ACTION });
          setIsPopoverOpen(false);
        }}
        disabled={isDeleteSelectedActionDisabled}
        toolTipContent={
          isDeleteActionDisabledBySpace
            ? `Integrations can only be deleted in the spaces: ${getSpacesAllowAction(
                SPACE_ACTIONS.DELETE
              ).join(', ')}`
            : selectedItems.length === 0
            ? 'Select integrations to delete.'
            : selectedItemsWithoutRelatedEntities.length === 0
            ? 'Integrations with associated rules, decoders, or KVDBs cannot be deleted.'
            : selectedItemsWithRelatedEntitiesCount > 0
            ? `${selectedItemsWithRelatedEntitiesCount} selected integration${
                selectedItemsWithRelatedEntitiesCount !== 1 ? 's have' : ' has'
              } associated ${selectedItemsRelatedEntitiesMessage} and will be skipped.`
            : undefined
        }
      >
        Delete selected ({selectedItems.length})
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="rearrange_integrations"
        icon="sortable"
        onClick={() => {
          setItemForAction({ action: SPACE_ACTIONS.REARRANGE_INTEGRATIONS });
          setIsPopoverOpen(false);
        }}
        disabled={isRearrangeIntegrationsActionDisabled}
        toolTipContent={
          isRearrangeIntegrationsActionDisabled
            ? `Integrations can only be rearranged in the spaces: ${getSpacesAllowAction(
                SPACE_ACTIONS.REARRANGE_INTEGRATIONS
              ).join(', ')}`
            : undefined
        }
      >
        Rearrange
      </EuiContextMenuItem>,
    ]
  );

  useEffect(() => {
    loadIntegrations();
  }, [dataSource, spaceFilter, loadIntegrations]);

  // Wazuh: re-check pending content changes to promote on space/content changes, to drive
  // the pending-promotion callout. (issue #8719)
  useEffect(() => {
    let cancelled = false;
    const checkPendingPromotions = async () => {
      const promotable =
        actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.PROMOTE) &&
        getNextSpace(spaceFilter as PromoteSpaces) != null;
      const hasChanges = promotable
        ? await DataStore.integrations.hasPromotableContentChanges(spaceFilter as PromoteSpaces)
        : false;
      if (!cancelled && isMountedRef.current) {
        setHasPendingPromotions(hasChanges);
      }
    };
    checkPendingPromotions();
    return () => {
      cancelled = true;
    };
  }, [spaceFilter, dataSource, policyRefresh, integrations]);

  // Wazuh: a dismissed callout stays hidden for the current space only.
  useEffect(() => {
    setPromotionCalloutDismissed(false);
  }, [spaceFilter]);

  const onSelectionChange = (selectedItems: IntegrationTableItem[]) => {
    setSelectedItems(selectedItems);
  };

  const showIntegrationDetails = useCallback(
    (id: string) => {
      history.push(`${ROUTES.INTEGRATIONS}/${id}?space=${spaceFilter}`);
    },
    [spaceFilter]
  );

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
              integrationName={itemForAction.item.title}
              detectionRulesCount={itemForAction.item.rules ?? 0}
              decodersCount={itemForAction.item.decoders ?? 0}
              kvdbsCount={itemForAction.item.kvdbs ?? 0}
              closeModal={() => setItemForAction(null)}
              onConfirm={() => deleteIntegration(itemForAction.item.id)}
            />
          )}
          {itemForAction.action === SPACE_ACTIONS.REARRANGE_INTEGRATIONS && (
            <RearrangeIntegrations
              space={spaceFilter}
              onClose={() => {
                setItemForAction(null);
                loadIntegrations();
              }}
              notifications={notifications}
            />
          )}
          {itemForAction.action === SPACE_ACTIONS.EDIT_POLICY && (
            <EditPolicy
              space={spaceFilter}
              notifications={notifications}
              onClose={() => setItemForAction(null)}
              onSuccess={() => setPolicyRefresh((prevState) => prevState + 1)}
            />
          )}
        </>
      )}
      {itemForAction?.action === CLEAR_SPACE_ACTION && (
        <EuiConfirmModal
          title="Clear draft space"
          onCancel={() => setItemForAction(null)}
          onConfirm={clearSpace}
          cancelButtonText="Cancel"
          confirmButtonText="Clear space"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isClearingSpace}
        >
          <p>
            This will reset the <strong>draft</strong> space to its initial state, removing all
            integrations, rules, decoders, KVDBs, and filters.
          </p>
          <p>Detectors will not be affected. This action cannot be undone.</p>
        </EuiConfirmModal>
      )}
      {itemForAction?.action === DELETE_SELECTED_ACTION && (
        <EuiConfirmModal
          title={`Delete ${selectedItemsWithoutRelatedEntities.length} integration${
            selectedItemsWithoutRelatedEntities.length !== 1 ? 's' : ''
          }`}
          onCancel={() => setItemForAction(null)}
          onConfirm={deleteSelectedIntegrations}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeletingSelected}
        >
          <p>
            {`Are you sure you want to delete ${
              selectedItemsWithoutRelatedEntities.length
            } integration${
              selectedItemsWithoutRelatedEntities.length !== 1 ? 's' : ''
            }? This action cannot be undone.`}
          </p>
          {selectedItemsWithRelatedEntitiesCount > 0 && (
            <p>
              {`${selectedItemsWithRelatedEntitiesCount} selected integration${
                selectedItemsWithRelatedEntitiesCount !== 1 ? 's have' : ' has'
              } associated ${selectedItemsRelatedEntitiesMessage} and will be skipped.`}
            </p>
          )}
        </EuiConfirmModal>
      )}

      <WazuhPageHeader
        appRightControls={[{ renderComponent: createIntegrationAction }]}
        appDescriptionControls={[{ description: pageDescription }]}
        title="Overview"
        /* Wazuh: no description under the title here. This one is per tab
           (TAB_DESCRIPTIONS), so it describes integrations or filters, not the Overview
           container it would sit under. */
        controls={[spaceSelector, overviewActionsButton]}
      />
      <EuiSpacer size="m" />
      {hasPendingPromotions && !promotionCalloutDismissed && pendingPromotionNextSpace != null && (
        <PendingPromotionCallout
          space={String(spaceFilter)}
          nextSpace={String(pendingPromotionNextSpace)}
          onPromote={() =>
            history.push({ pathname: ROUTES.PROMOTE, search: `?space=${spaceFilter}` })
          }
          onDismiss={() => setPromotionCalloutDismissed(true)}
        />
      )}
      <PolicyInfoCard space={spaceFilter} notifications={notifications} refresh={policyRefresh} />
      <EuiSpacer size={'m'} />
      <EuiCard
        textAlign="left"
        paddingSize="m"
        title={
          <EuiTabs size="s">
            <EuiTab
              isSelected={selectedTab === OVERVIEW_TAB.INTEGRATIONS}
              onClick={() => onTabChange(OVERVIEW_TAB.INTEGRATIONS)}
            >
              Integrations
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === OVERVIEW_TAB.FILTERS}
              onClick={() => onTabChange(OVERVIEW_TAB.FILTERS)}
            >
              Filters
            </EuiTab>
          </EuiTabs>
        }
      >
        <EuiSpacer size={'s'} />
        <EuiText size="s" color="subdued">
          {pageDescription}
        </EuiText>
        <EuiSpacer size={'m'} />
        {selectedTab === OVERVIEW_TAB.INTEGRATIONS ? (
          <RedirectAppLinks application={getApplication()}>
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
              search={{
                ...getIntegrationsTableSearchConfig({ toolsRight: [actionsButton] }),
                defaultQuery: EuiSearchBar.Query.parse(
                  buildQueryTextWithStatus(
                    buildQueryTextWithStatus(urlFilters.query, urlFilters.status),
                    urlFilters.category,
                    'category'
                  )
                ),
                onChange: ({ query }: { query: any }) => {
                  const { query: withoutStatus, status } = splitStatusFromQueryText(
                    query?.text ?? ''
                  );
                  const { query: freeText, status: category } = splitStatusFromQueryText(
                    withoutStatus,
                    'category'
                  );
                  writeInMemoryUrlFilterValues(history, { query: freeText, status, category });
                  return true;
                },
              }}
              selection={{
                onSelectionChange: onSelectionChange,
                initialSelected: [],
              }}
              isSelectable={true}
              loading={loading}
              message={
                loading ? undefined : (
                  <ListEmptyPrompt
                    entity="integrations"
                    hasFilters={integrations.length > 0}
                    space={spaceFilter}
                    onGoToStandard={() => setSpace(SpaceTypes.STANDARD.value)}
                  />
                )
              }
            />
          </RedirectAppLinks>
        ) : (
          <FiltersTab spaceFilter={spaceFilter} notifications={notifications} history={history} />
        )}
      </EuiCard>
    </>
  );
};
