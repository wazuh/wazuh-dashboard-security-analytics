/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { WazuhPageHeader } from '../../../components/WazuhPageHeader';
import { SpaceSelector } from '../../../components/SpaceSelector/SpaceSelector';
import { errorNotificationToast, setBreadcrumbs } from '../../../utils/helpers';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { DataStore } from '../../../store/DataStore';
import { DRAFT_UNAVAILABLE_IN_LOG_TEST, SpaceTypes } from '../../../../common/constants';
import { LogTestResponse } from '../../../../types';
import { LogTestForm, LogTestFormData, LogTestFormErrors } from '../components/LogTestForm';
import { LogTestResult } from '../components/LogTestResult';
import { IntegrationOption } from '../../../components/IntegrationComboBox';
import { MetadataEntry, buildMetadataObject } from '../utils';
import { DETECTION_RULE_NAV_ID, LOG_TEST_DOCUMENTATION_URL } from '../../../utils/constants';
import { buildAppUrl } from '../../../utils/routes';

// Wazuh: appDescriptionControls (home:useNewHomePage) needs a plain string, so the
// same sentence is kept here and reused as the JSX description below.
const PAGE_DESCRIPTION_TEXT =
  'Log test runs a sample event through the content loaded in a space, so you can confirm it is parsed and matched as expected.';

// Wazuh: also rendered as a child; appDescriptionControls needs home:useNewHomePage.
const PAGE_DESCRIPTION = (
  <>
    {PAGE_DESCRIPTION_TEXT}{' '}
    <EuiLink
      href={LOG_TEST_DOCUMENTATION_URL}
      target="_blank"
      external
      data-test-subj="logTestDocumentationLink"
    >
      View documentation
    </EuiLink>
  </>
);

// Wazuh: draft is listed so its absence stops reading as an oversight; it cannot be
// picked because its content never reaches the engine.
const LOG_TEST_SPACE_OPTIONS = [
  SpaceTypes.DRAFT.value,
  SpaceTypes.TEST.value,
  SpaceTypes.CUSTOM.value,
  SpaceTypes.STANDARD.value,
];

const LOG_TEST_UNAVAILABLE_SPACES = {
  [SpaceTypes.DRAFT.value]: DRAFT_UNAVAILABLE_IN_LOG_TEST,
};

const INITIAL_FORM_DATA: LogTestFormData = {
  queue: undefined,
  location: '',
  event: '',
  traceLevel: 'NONE',
  space: SpaceTypes.STANDARD.value,
  metadataFields: [],
  integration: '',
};

const INITIAL_ERRORS: LogTestFormErrors = {};

const INITIAL_SPACE_OPTIONS = [
  { id: SpaceTypes.TEST.value },
  { id: SpaceTypes.CUSTOM.value },
  { id: SpaceTypes.STANDARD.value },
];

interface SpaceCacheEntry {
  enabled: boolean;
  integrations: IntegrationOption[];
}

type SpaceCache = Record<string, SpaceCacheEntry>;

interface LogTestProps extends RouteComponentProps {
  notifications?: NotificationsStart;
}

export const LogTest: React.FC<LogTestProps> = ({ notifications, history }) => {
  const [formData, setFormData] = useState<LogTestFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<LogTestFormErrors>(INITIAL_ERRORS);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<LogTestResponse | null>(null);
  // Wazuh: the space the result belongs to. The selector can move after a test, and the
  // rule links must keep pointing at the space the event was actually evaluated in.
  const [testedSpace, setTestedSpace] = useState<string | null>(null);
  const [spaceCache, setSpaceCache] = useState<SpaceCache>({});

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.LOG_TEST]);
  }, []);

  const loadSpaceCache = useCallback(async (): Promise<SpaceCache> => {
    const entries = await Promise.all(
      INITIAL_SPACE_OPTIONS.map((option) =>
        DataStore.policies
          .searchPolicies(option.id, {
            includeIntegrationFields: ['document.id', 'document.metadata', 'document.enabled'],
          })
          .then((response): [string, SpaceCacheEntry] => {
            const policy = response.items[0];
            const integrations: IntegrationOption[] = Object.values(policy?.integrationsMap ?? {})
              .filter((i) => i.document?.enabled)
              .map((i) => ({
                id: i.document?.id,
                label: i.document?.metadata?.title ?? i.document?.id,
                value: i.document?.metadata?.title ?? i.document?.id,
              }));
            return [
              option.id,
              {
                enabled: !!policy && policy.document?.enabled !== false,
                integrations,
              },
            ];
          })
          .catch((error): [string, SpaceCacheEntry] => {
            console.error(`Ruleset management - LogTest - searchPolicies (${option.id}):`, error);
            errorNotificationToast(notifications, 'retrieve', 'policies', error);
            return [option.id, { enabled: false, integrations: [] }];
          })
      )
    );

    const cache: SpaceCache = Object.fromEntries(entries);
    setSpaceCache(cache);
    return cache;
  }, [notifications]);

  useEffect(() => {
    loadSpaceCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFormData((prev) => (prev.integration ? { ...prev, integration: '' } : prev));
  }, [formData.space]);

  const disabledSpaces = useMemo<string[]>(
    () => INITIAL_SPACE_OPTIONS.filter((o) => spaceCache[o.id]?.enabled === false).map((o) => o.id),
    [spaceCache]
  );

  const integrationOptions = useMemo<IntegrationOption[]>(
    () => spaceCache[formData.space]?.integrations ?? [],
    [spaceCache, formData.space]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: LogTestFormErrors = {};

    if (!formData.event.trim()) {
      newErrors.event = 'Log event is required';
    }

    if (!formData.space) {
      newErrors.space = 'Space is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleExecuteLogTest = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const result = await DataStore.logTests.executeLogTest({
      document: {
        queue: 1, // temporary hardcoded queue value
        location: String(formData.location ?? '').trim(),
        event: formData.event.trim(),
        trace_level: formData.traceLevel,
        metadata: buildMetadataObject(formData.metadataFields),
        space: formData.space,
        integration: formData.integration || undefined,
      },
    });

    setIsLoading(false);

    if (result.success && result.data) {
      setTestResult(result.data);
      setTestedSpace(formData.space);
    }
  };

  const handleFormChange = useCallback(
    (field: keyof LogTestFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // clears error when user starts typing
      if (errors[field as keyof LogTestFormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof LogTestFormErrors];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleMetadataFieldsChange = useCallback((fields: MetadataEntry[]) => {
    setFormData((prev) => ({ ...prev, metadataFields: fields }));
  }, []);

  const handleClearSession = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors(INITIAL_ERRORS);
    setTestResult(null);
    setTestedSpace(null);
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <WazuhPageHeader
          appDescriptionControls={[
            {
              description: PAGE_DESCRIPTION_TEXT,
              links: {
                controlType: 'link',
                label: 'View documentation',
                href: LOG_TEST_DOCUMENTATION_URL,
                target: '_blank',
                testId: 'logTestDocumentationLink',
              },
            },
          ]}
          title="Log test"
          description={PAGE_DESCRIPTION}
          controls={[
            <SpaceSelector
              selectedSpace={formData.space}
              onSpaceChange={(id) => handleFormChange('space', id)}
              isDisabled={isLoading}
              allowedSpaces={LOG_TEST_SPACE_OPTIONS}
              unavailableSpaces={LOG_TEST_UNAVAILABLE_SPACES}
            />,
          ]}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel>
          {disabledSpaces.includes(formData.space) && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                iconType="alert"
                title="This space is disabled. Log test execution will fail."
              />
              <EuiSpacer size="m" />
            </>
          )}
          <LogTestForm
            formData={formData}
            errors={errors}
            onFormChange={handleFormChange}
            onMetadataFieldsChange={handleMetadataFieldsChange}
            integrationOptions={integrationOptions}
            disabled={isLoading}
          />

          <EuiSpacer size="l" />

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="play"
                onClick={handleExecuteLogTest}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Testing...' : 'Test'}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton iconType="broom" onClick={handleClearSession} disabled={isLoading}>
                Clear session
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {testResult && (
            <>
              <EuiHorizontalRule margin="l" />
              <LogTestResult
                result={testResult}
                /* Wazuh: a real cross-app URL, so the link can be opened in a new tab,
                   copied, and read by assistive tech. The rule id goes in `query`, which
                   the rules list applies as its search, and the space is the one the test
                   ran against, not whatever the selector shows now. */
                ruleHref={(ruleId) =>
                  buildAppUrl(
                    DETECTION_RULE_NAV_ID,
                    `${ROUTES.RULES}?space=${encodeURIComponent(
                      testedSpace ?? formData.space
                    )}&dataSourceId=&query=${encodeURIComponent(ruleId)}`
                  )
                }
              />
            </>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
