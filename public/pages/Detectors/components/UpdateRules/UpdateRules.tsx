/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiSmallButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  DetectorHit,
  SearchDetectorsResponse,
  UpdateDetectorResponse,
} from '../../../../../server/models/interfaces';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { RuleItem } from '../../../CreateDetector/components/DefineDetector/components/DetectionRules/types/interfaces';
import { DetectionRulesTable } from '../../../CreateDetector/components/DefineDetector/components/DetectionRules/DetectionRulesTable';
import {
  BREADCRUMBS,
  DEFAULT_DETECTOR_INTEGRATION_SPACE,
  EMPTY_DEFAULT_DETECTOR,
  ROUTES,
} from '../../../../utils/constants';
import { SecurityAnalyticsContext } from '../../../../services';
import { ServerResponse } from '../../../../../server/models/types';
import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  errorNotificationToast,
  setBreadcrumbs,
  successNotificationToast,
} from '../../../../utils/helpers';
import { RuleTableItem } from '../../../Rules/utils/helpers';
import { RuleViewerFlyout } from '../../../Rules/components/RuleViewerFlyout/RuleViewerFlyout';
import { ContentPanel } from '../../../../components/ContentPanel';
import { DetectorIntegrationSelector } from '../../../../components/DetectorIntegrationSelector';
import { DataStore } from '../../../../store/DataStore';
import ReviewFieldMappings from '../ReviewFieldMappings/ReviewFieldMappings';
import {
  Detector,
  DetectorIntegrationSelection,
  DetectorIntegrationSpace,
  FieldMapping,
} from '../../../../../types';

export interface UpdateDetectorRulesProps
  extends RouteComponentProps<
    any,
    any,
    { detectorHit: DetectorHit; enabledRules?: RuleItem[]; allRules?: RuleItem[] }
  > {
  notifications: NotificationsStart;
}

const buildRuleItems = (
  rules: any[],
  library: 'Standard' | 'Custom',
  enabledRuleIds?: Set<string>
): RuleItem[] => {
  return rules.map((rule) => ({
    name: rule._source.title,
    id: rule._id,
    severity: rule._source.level,
    logType: rule._source.category,
    library,
    description: rule._source.description,
    active: enabledRuleIds ? enabledRuleIds.has(rule._id) : true,
    ruleInfo: rule,
  }));
};

export const UpdateDetectorRules: React.FC<UpdateDetectorRulesProps> = (props) => {
  const saContext = useContext(SecurityAnalyticsContext);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detector, setDetector] = useState<Detector>(EMPTY_DEFAULT_DETECTOR as Detector);
  const [integrationSpace, setIntegrationSpace] = useState<DetectorIntegrationSpace>(
    DEFAULT_DETECTOR_INTEGRATION_SPACE
  );
  const [customRuleItems, setCustomRuleItems] = useState<RuleItem[]>([]);
  const [prePackagedRuleItems, setPrePackagedRuleItems] = useState<RuleItem[]>([]);
  const detectorId = props.location.pathname.replace(`${ROUTES.EDIT_DETECTOR_RULES}/`, '');
  const [flyoutData, setFlyoutData] = useState<RuleTableItem | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>();
  const [fieldMappingsIsVisible, setFieldMappingsIsVisible] = useState(false);
  const [ruleQueryFields, setRuleQueryFields] = useState<Set<string>>();

  const getRuleFieldsForEnabledRules = useCallback(async (enabledRules) => {
    const ruleFieldsForEnabledRules = new Set<string>();
    enabledRules.forEach((rule: RuleItem) => {
      const fieldNames = rule.ruleInfo._source.query_field_names;
      fieldNames.forEach((fieldname: { value: string }) => {
        ruleFieldsForEnabledRules.add(fieldname.value);
      });
    });

    setRuleQueryFields(ruleFieldsForEnabledRules);
  }, []);

  const loadRulesForDetector = useCallback(
    async (nextDetector: Detector, enabledRuleIds?: string[]) => {
      if (!nextDetector.detector_type) {
        setPrePackagedRuleItems([]);
        setCustomRuleItems([]);
        setRuleQueryFields(undefined);
        return;
      }

      const allRules = await DataStore.rules.getAllRules({
        'rule.category': [nextDetector.detector_type.toLowerCase()],
      });
      const enabledRules = enabledRuleIds ? new Set(enabledRuleIds) : undefined;

      const nextPrePackagedRuleItems = buildRuleItems(
        allRules.filter((rule) => rule.prePackaged),
        'Standard',
        enabledRules
      );
      const nextCustomRuleItems = buildRuleItems(
        allRules.filter((rule) => !rule.prePackaged),
        'Custom',
        enabledRules
      );

      setPrePackagedRuleItems(nextPrePackagedRuleItems);
      setCustomRuleItems(nextCustomRuleItems);

      if (!enabledRuleIds) {
        await getRuleFieldsForEnabledRules(
          nextPrePackagedRuleItems.concat(nextCustomRuleItems).filter((rule) => rule.active)
        );
      }
    },
    [getRuleFieldsForEnabledRules]
  );

  useEffect(() => {
    const getDetector = async () => {
      setLoading(true);
      const response = (await saContext?.services.detectorsService.getDetectors()) as ServerResponse<
        SearchDetectorsResponse
      >;
      if (response.ok) {
        const detectorHit = response.response.hits.hits.find(
          (detectorHit) => detectorHit._id === detectorId
        ) as DetectorHit;
        const newDetector = { ...detectorHit._source, id: detectorId } as Detector;
        const resolvedSelection = DataStore.integrations
          ? await DataStore.integrations.resolveDetectorIntegrationSelection({
              detectorType: newDetector.detector_type,
              integrationId: newDetector.integration_id,
              preferredSpace: DEFAULT_DETECTOR_INTEGRATION_SPACE,
            })
          : {
              detectorType: newDetector.detector_type,
              integrationId: newDetector.integration_id,
              integrationSpace: DEFAULT_DETECTOR_INTEGRATION_SPACE,
            };
        const resolvedDetector = {
          ...newDetector,
          detector_type: resolvedSelection.detectorType || newDetector.detector_type,
          integration_id: resolvedSelection.integrationId,
        } as Detector;
        setDetector(resolvedDetector);
        setIntegrationSpace(resolvedSelection.integrationSpace);

        setBreadcrumbs([
          BREADCRUMBS.DETECTION,
          BREADCRUMBS.DETECTORS,
          BREADCRUMBS.DETECTORS_DETAILS(detectorHit._source.name, detectorHit._id),
          {
            text: 'Edit detector rules',
          },
        ]);
        await loadRulesForDetector(resolvedDetector, [
          ...resolvedDetector.inputs[0].detector_input.pre_packaged_rules.map((rule) => rule.id),
          ...resolvedDetector.inputs[0].detector_input.custom_rules.map((rule) => rule.id),
        ]);
      } else {
        errorNotificationToast(props.notifications, 'retrieve', 'detector', response.error);
      }
      setLoading(false);
    };

    const execute = async () => {
      if (detectorId.length > 0) await getDetector();
    };

    execute().catch((e) => {
      errorNotificationToast(props.notifications, 'retrieve', 'detector and rules', e);
    });
  }, [detectorId, loadRulesForDetector, props.notifications, saContext?.services]);

  const onToggle = async (changedItem: RuleItem, isActive: boolean) => {
    setFieldMappingsIsVisible(true);
    switch (changedItem.library) {
      case 'Custom':
        const updatedCustomRules: RuleItem[] = customRuleItems.map((rule) =>
          rule.id === changedItem.id ? { ...rule, active: isActive } : rule
        );
        setCustomRuleItems(updatedCustomRules);
        const withCustomRulesUpdated = prePackagedRuleItems
          .concat(updatedCustomRules)
          .filter((rule) => rule.active);
        await getRuleFieldsForEnabledRules(withCustomRulesUpdated);
        break;
      case 'Standard':
        const updatedPrePackgedRules: RuleItem[] = prePackagedRuleItems.map((rule) =>
          rule.id === changedItem.id ? { ...rule, active: isActive } : rule
        );
        setPrePackagedRuleItems(updatedPrePackgedRules);
        const withPrePackagedRulesUpdated = updatedPrePackgedRules
          .concat(customRuleItems)
          .filter((rule) => rule.active);
        await getRuleFieldsForEnabledRules(withPrePackagedRulesUpdated);
        break;
      default:
        console.warn('Unsupported rule library detected.');
    }
  };

  const onAllRulesToggle = async (isActive: boolean) => {
    setFieldMappingsIsVisible(true);
    const customRules: RuleItem[] = customRuleItems.map((rule) => ({ ...rule, active: isActive }));
    const prePackagedRules: RuleItem[] = prePackagedRuleItems.map((rule) => ({
      ...rule,
      active: isActive,
    }));
    setCustomRuleItems(customRules);
    setPrePackagedRuleItems(prePackagedRules);

    const enabledRules = prePackagedRules.concat(customRules);
    await getRuleFieldsForEnabledRules(enabledRules);
  };

  const onCancel = useCallback(() => {
    props.history.replace({
      pathname: `${ROUTES.DETECTOR_DETAILS}/${detectorId}`,
      state: props.location.state,
    });
  }, []);

  const onSave = async () => {
    if (!detector.detector_type || !detector.integration_id) {
      return;
    }

    setSubmitting(true);

    const updateDetector = async () => {
      const newDetector = { ...detector };
      newDetector.inputs[0].detector_input.custom_rules = customRuleItems
        .filter((rule) => rule.active)
        .map((rule) => ({ id: rule.id }));
      newDetector.inputs[0].detector_input.pre_packaged_rules = prePackagedRuleItems
        .filter((rule) => rule.active)
        .map((rule) => ({ id: rule.id }));

      const updateDetectorRes = (await saContext?.services?.detectorsService?.updateDetector(
        detectorId,
        newDetector
      )) as ServerResponse<UpdateDetectorResponse>;

      if (!updateDetectorRes.ok) {
        errorNotificationToast(props.notifications, 'update', 'detector', updateDetectorRes.error);
      } else {
        successNotificationToast(props.notifications, 'updated', 'detector');
      }

      setSubmitting(false);
      props.history.replace({
        pathname: `${ROUTES.DETECTOR_DETAILS}/${detectorId}`,
      });
    };

    try {
      if (fieldMappings?.length) {
        const createMappingsResponse = await saContext?.services.fieldMappingService?.createMappings(
          detector.inputs[0].detector_input.indices[0],
          detector.detector_type.toLowerCase(),
          fieldMappings
        );

        if (!createMappingsResponse?.ok) {
          errorNotificationToast(
            props.notifications,
            'update',
            'field mappings',
            createMappingsResponse?.error
          );
        } else {
          await updateDetector();
        }
      } else {
        await updateDetector();
      }
    } catch (e: any) {
      errorNotificationToast(props.notifications, 'update', 'detector', e);
    }
    setSubmitting(false);
  };

  const ruleItems = prePackagedRuleItems.concat(customRuleItems);

  const onDetectorSelectionChange = useCallback(
    async ({ detectorType, integrationId, integrationSpace }: DetectorIntegrationSelection) => {
      const nextDetector = {
        ...detector,
        detector_type: detectorType,
        integration_id: integrationId,
      };

      setDetector(nextDetector);
      setIntegrationSpace(integrationSpace);
      setFieldMappingsIsVisible(true);

      if (!detectorType) {
        setPrePackagedRuleItems([]);
        setCustomRuleItems([]);
        setRuleQueryFields(undefined);
        return;
      }

      await loadRulesForDetector(nextDetector);
    },
    [detector, loadRulesForDetector]
  );

  const onRuleDetails = (ruleItem: RuleItem) => {
    setFlyoutData(() => ({
      title: ruleItem.name,
      level: ruleItem.severity,
      category: ruleItem.logType,
      description: ruleItem.description,
      source: ruleItem.library,
      ruleInfo: { ...ruleItem.ruleInfo, prePackaged: ruleItem.library === 'Standard' },
      ruleId: ruleItem.id,
    }));
  };

  const updateFieldMappingsState = useCallback(
    (mapping: FieldMapping[]) => {
      setFieldMappings(mapping);
    },
    [setFieldMappings]
  );

  const onFieldMappingChange = useCallback(
    (fields: FieldMapping[]) => {
      const updatedFields = [...fields];
      updateFieldMappingsState(updatedFields);
    },
    [fieldMappings, updateFieldMappingsState]
  );

  return (
    <div>
      {flyoutData ? (
        <RuleViewerFlyout
          hideFlyout={() => setFlyoutData(() => null)}
          history={null as any}
          ruleTableItem={flyoutData}
        />
      ) : null}
      <EuiTitle size={'m'}>
        <h3>Edit detector rules</h3>
      </EuiTitle>
      <EuiSpacer size="xl" />

      <ContentPanel
        title={`Rules (${
          // Wazuh: rename 'Detection rules' to 'Rules'
          prePackagedRuleItems.concat(customRuleItems).filter((item) => item.active).length
        })`}
      >
        <DetectorIntegrationSelector
          detectorType={detector.detector_type}
          integrationId={detector.integration_id}
          integrationSpace={integrationSpace}
          enabled={!loading && !!detectorId}
          onSelectionChange={onDetectorSelectionChange}
        />

        <EuiSpacer size="l" />

        <DetectionRulesTable
          loading={loading}
          ruleItems={ruleItems}
          onRuleActivationToggle={onToggle}
          onAllRulesToggled={onAllRulesToggle}
          onRuleDetails={onRuleDetails}
        />

        <EuiSpacer size="xl" />

        {fieldMappingsIsVisible ? (
          <ReviewFieldMappings
            {...props}
            ruleQueryFields={ruleQueryFields}
            detector={detector}
            fieldMappingService={saContext?.services.fieldMappingService}
            onFieldMappingChange={onFieldMappingChange}
          />
        ) : null}

        <EuiSpacer size="xl" />

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiSmallButton disabled={submitting} onClick={onCancel}>
              Cancel
            </EuiSmallButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSmallButton
              disabled={loading || !detector.detector_type || !detector.integration_id}
              fill={true}
              isLoading={submitting}
              onClick={onSave}
              data-test-subj={'save-detector-rules-edits'}
            >
              Save changes
            </EuiSmallButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ContentPanel>
    </div>
  );
};
