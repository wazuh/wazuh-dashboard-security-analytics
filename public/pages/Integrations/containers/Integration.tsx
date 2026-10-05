/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RouteComponentProps, useLocation, useParams } from 'react-router-dom';
import { IntegrationItem, Space } from '../../../../types';
import { SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace, getSpacesAllowAction } from '../../../../common/helpers';
import {
  EuiSmallButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { DataStore } from '../../../store/DataStore';
import {
  BREADCRUMBS,
  ROUTES,
  DETECTION_RULE_NAV_ID,
  DECODERS_NAV_ID,
  KVDBS_NAV_ID,
} from '../../../utils/constants';
import {
  INTEGRATION_DETAILS_TAB,
  integrationDetailsTabs,
  IntegrationMode,
} from '../utils/constants';
import { IntegrationDetails } from '../components/IntegrationDetails';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { IntegrationDetectionRules } from '../components/IntegrationDetectionRules';
import { IntegrationDecoders } from '../components/IntegrationDecoders';
import { IntegrationKVDBs } from '../components/IntegrationKVDBs';
import { DeleteIntegrationModal } from '../components/DeleteIntegrationModal';
import { setBreadcrumbs, successNotificationToast } from '../../../utils/helpers';
import { buildEntityQueryRoute } from '../../../utils/routes';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import {
  buildIntegrationDetailsRoute,
  formatIntegrationMetadataDate,
  getSelectedTabFromUrl,
} from '../utils/helpers';
import { useIntegrationDetails } from '../hooks/useIntegrationDetails';

export interface IntegrationProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

// Wazuh: also rendered as a child; appDescriptionControls needs home:useNewHomePage.
const INTEGRATION_DESCRIPTION =
  'An integration is the top-level unit of ruleset management: it groups the decoders, rules and KVDBs that add support for one log source or use case.';

export const Integration: React.FC<IntegrationProps> = ({ notifications, history }) => {
  const { integrationId } = useParams<{ integrationId: string }>();
  const location = useLocation();
  const spaceParam = new URLSearchParams(location.search).get('space') ?? undefined;
  // Wazuh: the open tab lives in the URL so it survives a refresh, can be linked to,
  // and — via `returnTo` below — can be handed to an editor to come back to.
  const [selectedTabId, setSelectedTabId] = useState<string>(() =>
    getSelectedTabFromUrl(location.search)
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);

  // Wazuh: the integration document is the page's single source of truth — the
  // tab id lists and the summary counts are both derived from it — so it owns
  // the reload. `reloadTrigger` changes once per re-read document and travels
  // down to the tabs, keeping table, cascade and counts in step (#478).
  const {
    integration: integrationDetails,
    reloadTrigger,
    notFound,
    refresh: refreshIntegration,
    setIntegration: setIntegrationDetails,
  } = useIntegrationDetails(integrationId, spaceParam, notifications);

  const infoText: React.ReactNode = notFound ? (
    'Integration not found!' // Replace Log Type to Integration by Wazuh
  ) : (
    <>
      Loading details &nbsp;
      <EuiLoadingSpinner size="l" />
    </>
  );

  useEffect(() => {
    if (integrationDetails) {
      setBreadcrumbs([
        BREADCRUMBS.INTEGRATIONS,
        { text: integrationDetails.document.metadata?.title ?? '' },
      ]);
    }
  }, [integrationDetails]);

  const ruleIds = useMemo(() => integrationDetails?.document.rules ?? [], [integrationDetails]);
  const decoderIds = useMemo(
    () => integrationDetails?.document.decoders ?? [],
    [integrationDetails]
  );
  const kvdbIds = useMemo(() => integrationDetails?.document.kvdbs ?? [], [integrationDetails]);

  const selectTab = useCallback(
    (tabId: string) => {
      setSelectedTabId(tabId);
      history.replace(
        buildIntegrationDetailsRoute(integrationId, { space: spaceParam, tab: tabId })
      );
    },
    [history, integrationId, spaceParam]
  );

  const returnTo = useMemo(
    () => buildIntegrationDetailsRoute(integrationId, { space: spaceParam, tab: selectedTabId }),
    [integrationId, spaceParam, selectedTabId]
  );

  // Every "Create <entity>" affordance on this page carries the integration in
  // the URL, so the create form opens with its Integration field already filled in.
  const integrationTitle = integrationDetails?.document.metadata?.title ?? '';
  const createHref = useCallback(
    (navId: string, route: string) =>
      `${navId}#${integrationTitle ? buildEntityQueryRoute(route, integrationTitle) : route}`,
    [integrationTitle]
  );

  // Wazuh: the count opens its child tab; zero stays a disabled link, as in the list.
  const renderCountLink = (count: number, tabId: string, entityLabel: string) => {
    const link =
      count > 0 ? (
        <EuiLink onClick={() => selectTab(tabId)}>{count}</EuiLink>
      ) : (
        <EuiLink disabled>{count}</EuiLink>
      );

    // <span> host: a disabled EuiLink emits no hover events, so the tooltip needs one.
    return (
      <EuiToolTip
        content={
          count > 0 ? `Go to the ${entityLabel} tab` : `This integration has no ${entityLabel}`
        }
      >
        <span>{link}</span>
      </EuiToolTip>
    );
  };

  const renderTabContent = () => {
    switch (selectedTabId) {
      case INTEGRATION_DETAILS_TAB.DECODERS:
        return (
          <IntegrationDecoders
            decoderIds={decoderIds}
            space={integrationDetails?.space?.name ?? ''}
            enabled={selectedTabId === INTEGRATION_DETAILS_TAB.DECODERS}
            history={history}
            returnTo={returnTo}
            createHref={createHref(DECODERS_NAV_ID, ROUTES.DECODERS_CREATE)}
            reloadTrigger={reloadTrigger}
            onRefresh={refreshIntegration}
          />
        );
      case INTEGRATION_DETAILS_TAB.KVDBS:
        return (
          <IntegrationKVDBs
            kvdbIds={kvdbIds}
            space={integrationDetails?.space?.name ?? ''}
            enabled={selectedTabId === INTEGRATION_DETAILS_TAB.KVDBS}
            history={history}
            returnTo={returnTo}
            createHref={createHref(KVDBS_NAV_ID, ROUTES.KVDBS_CREATE)}
            reloadTrigger={reloadTrigger}
            onRefresh={refreshIntegration}
          />
        );
      case INTEGRATION_DETAILS_TAB.DETECTION_RULES:
        return (
          <IntegrationDetectionRules
            ruleIds={ruleIds}
            space={integrationDetails?.space?.name ?? ''}
            enabled={selectedTabId === INTEGRATION_DETAILS_TAB.DETECTION_RULES}
            history={history}
            returnTo={returnTo}
            createHref={createHref(DETECTION_RULE_NAV_ID, ROUTES.RULES_CREATE)}
            reloadTrigger={reloadTrigger}
            onRefresh={refreshIntegration}
          />
        );
      case INTEGRATION_DETAILS_TAB.DETAILS:
      default:
        return (
          <IntegrationDetails
            integrationDetails={integrationDetails!}
            isEditMode={isEditMode}
            notifications={notifications}
            setIsEditMode={setIsEditMode}
            setIntegrationDetails={setIntegrationDetails}
            integrationId={integrationId}
          />
        );
    }
  };

  const deleteIntegration = async () => {
    const { ok } = await DataStore.integrations.deleteIntegration(integrationDetails!.id);

    if (ok) {
      successNotificationToast(notifications, 'deleted', 'integration');
      history.push(ROUTES.INTEGRATIONS);
    }
  };

  const toggleActionsMenu = () => {
    setIsActionsMenuOpen((state) => !state);
  };

  const closeActionsPopover = () => {
    setIsActionsMenuOpen(false);
  };

  const toggleIntegrationEnabled = async (checked: boolean) => {
    if (!integrationDetails) {
      return;
    }
    setTogglingEnabled(true);
    const next: IntegrationItem = {
      ...integrationDetails,
      document: {
        ...integrationDetails.document,
        enabled: checked,
      },
    };
    const success = await DataStore.integrations.updateIntegration(integrationDetails.id, next);
    if (success) {
      setIntegrationDetails(next);
      successNotificationToast(
        notifications,
        'updated',
        `integration ${next.document.metadata?.title ?? ''}`
      );
    }
    setTogglingEnabled(false);
  };

  const spaceName = (integrationDetails?.space.name ?? '') as Space;
  const isCreateDisabled = !actionIsAllowedOnSpace(spaceName, SPACE_ACTIONS.CREATE);
  const isEditDisabled = !actionIsAllowedOnSpace(spaceName, SPACE_ACTIONS.EDIT);
  const isDeleteDisabled = !actionIsAllowedOnSpace(spaceName, SPACE_ACTIONS.DELETE);
  const isDisableIntegrationsDisabled = !actionIsAllowedOnSpace(
    spaceName,
    SPACE_ACTIONS.DISABLE_INTEGRATIONS
  );

  const integrationEnabled = integrationDetails?.document.enabled === true;

  const actionsButton = (
    <EuiPopover
      id={'integrationsActionsPopover'}
      button={
        <EuiSmallButton
          isLoading={togglingEnabled}
          iconType={'arrowDown'}
          iconSide={'right'}
          onClick={toggleActionsMenu}
          data-test-subj={'integrationsActionsButton'}
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isActionsMenuOpen}
      closePopover={closeActionsPopover}
      panelPaddingSize={'none'}
      anchorPosition={'downLeft'}
      data-test-subj={'integrationsActionsPopover'}
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key={'createRule'}
            href={createHref(DETECTION_RULE_NAV_ID, ROUTES.RULES_CREATE)}
            target="_blank"
            onClick={() => {
              closeActionsPopover();
            }}
            data-test-subj={'createRuleButton'}
            disabled={isCreateDisabled}
            toolTipContent={
              isCreateDisabled
                ? `Rules can only be created in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.CREATE
                  ).join(', ')}`
                : undefined
            }
          >
            Create rule
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key={'createDecoder'}
            href={createHref(DECODERS_NAV_ID, ROUTES.DECODERS_CREATE)}
            target="_blank"
            onClick={() => {
              closeActionsPopover();
            }}
            data-test-subj={'createDecoderButton'}
            disabled={isCreateDisabled}
            toolTipContent={
              isCreateDisabled
                ? `Decoders can only be created in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.CREATE
                  ).join(', ')}`
                : undefined
            }
          >
            Create decoder
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key={'createKVDB'}
            href={createHref(KVDBS_NAV_ID, ROUTES.KVDBS_CREATE)}
            target="_blank"
            onClick={() => {
              closeActionsPopover();
            }}
            data-test-subj={'createKVDBButton'}
            disabled={isCreateDisabled}
            toolTipContent={
              isCreateDisabled
                ? `KVDBs can only be created in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.CREATE
                  ).join(', ')}`
                : undefined
            }
          >
            Create KVDB
          </EuiContextMenuItem>,
          <EuiHorizontalRule margin="xs" />,
          <EuiContextMenuItem
            key={'toggleIntegrationEnabled'}
            disabled={
              togglingEnabled ||
              integrationDetails?.document.mode === IntegrationMode.Protected ||
              isDisableIntegrationsDisabled
            }
            onClick={() => {
              closeActionsPopover();
              toggleIntegrationEnabled(!integrationEnabled);
            }}
            data-test-subj={'integrationEnableDisableMenuItem'}
            toolTipContent={
              isDisableIntegrationsDisabled
                ? `Integrations can only be enabled or disabled in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.DISABLE_INTEGRATIONS
                  ).join(', ')}`
                : integrationDetails?.document.mode === IntegrationMode.Protected
                ? 'The integration is protected'
                : undefined
            }
          >
            {integrationEnabled ? 'Disable' : 'Enable'}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key={'Edit'}
            onClick={() => {
              closeActionsPopover();
              setIsEditMode(true);
              selectTab(INTEGRATION_DETAILS_TAB.DETAILS);
            }}
            disabled={isEditDisabled}
            data-test-subj={'editIntegrationButton'}
            toolTipContent={
              isEditDisabled
                ? `Integrations can only be edited in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.EDIT
                  ).join(', ')}`
                : undefined
            }
          >
            Edit
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key={'Delete'}
            onClick={() => {
              closeActionsPopover();
              setShowDeleteModal(true);
            }}
            data-test-subj={'deleteIntegrationButton'}
            disabled={isDeleteDisabled}
            toolTipContent={
              isDeleteDisabled
                ? `Integrations can only be deleted in the spaces: ${getSpacesAllowAction(
                    SPACE_ACTIONS.DELETE
                  ).join(', ')}`
                : undefined
            }
          >
            Delete
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );

  return !integrationDetails ? (
    <EuiTitle>
      <h2>{infoText}</h2>
    </EuiTitle>
  ) : (
    <>
      {showDeleteModal && (
        <DeleteIntegrationModal
          integrationId={integrationDetails.id}
          integrationName={integrationDetails.document.metadata?.title ?? ''}
          detectionRulesCount={integrationDetails.detectionRulesCount} // TODO: refactor to avoid passing this prop
          decodersCount={integrationDetails.decodersCount}
          kvdbsCount={integrationDetails.kvdbsCount}
          closeModal={() => setShowDeleteModal(false)}
          onConfirm={deleteIntegration}
        />
      )}
      <PageHeader
        appBadgeControls={[
          {
            renderComponent: (
              <EuiHealth color={integrationEnabled ? 'success' : 'subdued'}>
                {integrationEnabled ? 'Enabled' : 'Disabled'}
              </EuiHealth>
            ),
          },
        ]}
        appRightControls={[{ renderComponent: actionsButton }]}
        appDescriptionControls={[{ description: INTEGRATION_DESCRIPTION }]}
      >
        <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText data-test-subj="integration-detail-title" size="s">
                  <h1>{integrationDetails.document.metadata?.title}</h1>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color={integrationEnabled ? 'success' : 'subdued'}>
                  {integrationEnabled ? 'Enabled' : 'Disabled'}
                </EuiHealth>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {INTEGRATION_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>{actionsButton}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </PageHeader>
      <EuiSpacer />
      <EuiPanel grow={false}>
        <div className="integration-details-summary-panel">
          <div className="integration-details-summary-panel__id">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'ID',
                  description: (
                    <span style={{ overflowWrap: 'anywhere' }}>
                      {integrationDetails.document.id}
                    </span>
                  ),
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__date">
            <EuiDescriptionList
              listItems={[
                {
                  // Wazuh: canonical label per TERMINOLOGY.md
                  title: 'Created',
                  description: formatIntegrationMetadataDate(
                    integrationDetails.document.metadata?.date
                  ),
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__modified">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Modified',
                  description: formatIntegrationMetadataDate(
                    integrationDetails.document.metadata?.modified
                  ),
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__space">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Space',
                  description: integrationDetails.space.name,
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__rules">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Rules',
                  description: renderCountLink(
                    integrationDetails.detectionRulesCount,
                    INTEGRATION_DETAILS_TAB.DETECTION_RULES,
                    'rules'
                  ),
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__decoders">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Decoders',
                  description: renderCountLink(
                    integrationDetails.decodersCount,
                    INTEGRATION_DETAILS_TAB.DECODERS,
                    'decoders'
                  ),
                },
              ]}
            />
          </div>
          <div className="integration-details-summary-panel__kvdbs">
            <EuiDescriptionList
              listItems={[
                {
                  title: 'KVDBs',
                  description: renderCountLink(
                    integrationDetails.kvdbsCount,
                    INTEGRATION_DETAILS_TAB.KVDBS,
                    'KVDBs'
                  ),
                },
              ]}
            />
          </div>
        </div>
      </EuiPanel>
      <EuiSpacer />
      <EuiTabs size="s">
        {integrationDetailsTabs.map((tab, index) => {
          return (
            <EuiTab
              onClick={() => {
                selectTab(tab.id);
              }}
              key={index}
              isSelected={selectedTabId === tab.id}
            >
              {tab.name}
            </EuiTab>
          );
        })}
      </EuiTabs>
      <EuiSpacer size="m" />
      {renderTabContent()}
    </>
  );
};
