/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RouteComponentProps, useParams } from 'react-router-dom';
import { IntegrationItem } from '../../../../types';
import {
  EuiSmallButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { DataStore } from '../../../store/DataStore';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { integrationDetailsTabs } from '../utils/constants';
import { IntegrationDetails } from '../components/IntegrationDetails';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { IntegrationDetectionRules } from '../components/IntegrationDetectionRules';
import { IntegrationDecoders } from '../components/IntegrationDecoders';
import { IntegrationKVDBs } from '../components/IntegrationKVDBs';
import { RuleTableItem } from '../../Rules/utils/helpers';
import { DeleteIntegrationModal } from '../components/DeleteIntegrationModal';
import {
  errorNotificationToast,
  setBreadcrumbs,
  successNotificationToast,
} from '../../../utils/helpers';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { useIntegrationDecoders } from '../../Decoders/hooks/useIntegrationDecoders';
import { useIntegrationKVDBs } from '../../KVDBs/hooks/useIntegrationKVDBs';

export interface IntegrationProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

export const Integration: React.FC<IntegrationProps> = ({ notifications, history }) => {
  const { integrationId } = useParams<{ integrationId: string }>();
  const [selectedTabId, setSelectedTabId] = useState('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [infoText, setInfoText] = useState<React.ReactNode | string>(
    <>
      Loading details &nbsp;
      <EuiLoadingSpinner size="l" />
    </>
  );
  const [integrationDetails, setIntegrationDetails] = useState<IntegrationItem | undefined>(
    undefined
  );
  const [initialIntegrationDetails, setInitialIntegrationDetails] = useState<
    IntegrationItem | undefined
  >(undefined);

  const [isEditMode, setIsEditMode] = useState(false);
  const [rules, setRules] = useState<RuleTableItem[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);

  const updateRules = useCallback(
    async (details: IntegrationItem, intialDetails: IntegrationItem) => {
      const rulesRes = await DataStore.rules.getAllRules({
        'rule.category': [details.document.title.toLowerCase()],
      });
      const ruleItems = rulesRes.map((rule) => ({
        title: rule._source.title,
        level: rule._source.level,
        category: rule._source.category,
        description: rule._source.description,
        source: rule.prePackaged ? 'Standard' : 'Custom',
        ruleInfo: rule,
        ruleId: rule._id,
      }));
      setRules(ruleItems);
      setLoadingRules(false);
      setIntegrationDetails({
        ...details,
        detectionRulesCount: ruleItems.length,
      });
      setInitialIntegrationDetails({
        ...intialDetails,
        detectionRulesCount: ruleItems.length,
      });
    },
    []
  );

  useEffect(() => {
    const getIntegrationDetails = async () => {
      const details = await DataStore.integrations.getIntegration(integrationId);

      if (!details) {
        setInfoText('Integration not found!'); // Replace Log Type to Integration by Wazuh
        return;
      }

      setBreadcrumbs([BREADCRUMBS.INTEGRATIONS, { text: details.document.title }]);
      const integrationItem = {
        ...details,
        detectionRulesCount: details.detectionRules.length ?? 0,
        decodersCount: details.document.decoders?.length ?? 0,
        kvdbsCount: details.document.kvdbs?.length ?? 0,
      };
      setIntegrationDetails(integrationItem);
      setInitialIntegrationDetails(integrationItem);
      updateRules(integrationItem, integrationItem);
    };

    getIntegrationDetails();
  }, []);

  const refreshRules = useCallback(() => {
    updateRules(integrationDetails!, initialIntegrationDetails!);
  }, [integrationDetails]);

  const decoderIds = useMemo(() => integrationDetails?.document.decoders ?? [], [
    integrationDetails,
  ]);
  const {
    items: decoderItems,
    loading: loadingDecoders,
    refresh: refreshDecoders,
  } = useIntegrationDecoders({
    decoderIds,
    space: integrationDetails?.space?.name ?? '',
  });

  const kvdbIds = useMemo(() => integrationDetails?.document.kvdbs ?? [], [integrationDetails]);
  const { items: kvdbItems, loading: loadingKvdbs, refresh: refreshKvdbs } = useIntegrationKVDBs({
    kvdbIds,
  });

  const renderTabContent = () => {
    switch (selectedTabId) {
      case 'decoders':
        return (
          <IntegrationDecoders
            decoders={decoderItems}
            loading={loadingDecoders}
            space={integrationDetails?.space?.name ?? ''}
            onRefresh={refreshDecoders}
          />
        );
      case 'kvdbs':
        return (
          <IntegrationKVDBs kvdbs={kvdbItems} loading={loadingKvdbs} onRefresh={refreshKvdbs} />
        );
      case 'detection_rules':
        return (
          <IntegrationDetectionRules
            loadingRules={loadingRules}
            rules={rules}
            refreshRules={refreshRules}
          />
        );
      case 'details':
      default:
        return (
          <IntegrationDetails
            initialIntegrationDetails={initialIntegrationDetails!}
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
    const deleteSucceeded = await DataStore.integrations.deleteIntegration(integrationDetails!.id);
    if (deleteSucceeded) {
      successNotificationToast(notifications, 'deleted', 'integration');
      history.push(ROUTES.INTEGRATIONS);
    } else {
      errorNotificationToast(notifications, 'delete', 'integration');
    }
  };

  const deleteAction = (
    <EuiToolTip content="Delete" position="bottom">
      <EuiSmallButtonIcon
        iconType={'trash'}
        color="danger"
        onClick={() => setShowDeleteModal(true)}
      />
    </EuiToolTip>
  );

  return !integrationDetails ? (
    <EuiTitle>
      <h2>{infoText}</h2>
    </EuiTitle>
  ) : (
    <>
      {showDeleteModal && (
        <DeleteIntegrationModal
          integrationName={integrationDetails.document.title}
          detectionRulesCount={integrationDetails.detectionRulesCount} // TODO: refactor to avoid passing this prop
          closeModal={() => setShowDeleteModal(false)}
          onConfirm={deleteIntegration}
        />
      )}
      <PageHeader appRightControls={[{ renderComponent: deleteAction }]}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle>
              <h1>{integrationDetails.document.title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{deleteAction}</EuiFlexItem>
        </EuiFlexGroup>
      </PageHeader>
      <EuiSpacer />
      <EuiPanel grow={false}>
        <EuiDescriptionList
          listItems={[
            {
              title: 'Description',
              description: integrationDetails.document.description,
            },
          ]}
        />
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList listItems={[{ title: 'ID', description: integrationDetails.id }]} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Detection rules',
                  description: integrationDetails.detectionRulesCount,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Decoders',
                  description: integrationDetails.decodersCount,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'KVDBs',
                  description: integrationDetails.kvdbsCount,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Space',
                  description: integrationDetails.space.name,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
      <EuiTabs size="s">
        {integrationDetailsTabs.map((tab, index) => {
          return (
            <EuiTab
              onClick={() => {
                setSelectedTabId(tab.id);
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
