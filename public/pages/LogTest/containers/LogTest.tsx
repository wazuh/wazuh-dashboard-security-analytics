/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { LogTestResponse, LogTestScope } from '../../../../types';
import {
  LogTestForm,
  LogTestFormData,
  LogTestFormErrors,
  LogTestIntegrationOption,
} from '../components/LogTestForm';
import { LogTestResult } from '../components/LogTestResult';
import { LogTestScopeSelector } from '../components/LogTestScopeSelector';
import {
  LogTestSpaceReadiness,
  MetadataEntry,
  buildMetadataObject,
  describeUnavailableScope,
  getScopeAvailability,
  parseNormalizedEvent,
  pickDefaultScope,
  readLogTestUrlState,
  writeLogTestUrlState,
} from '../utils';
import {
  DETECTION_RULE_NAV_ID,
  INTEGRATIONS_NAV_ID,
  LOG_TEST_DOCUMENTATION_URL,
} from '../../../utils/constants';
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
  normalizedEvent: '',
};

const INITIAL_ERRORS: LogTestFormErrors = {};

const INITIAL_SPACE_OPTIONS = [
  { id: SpaceTypes.TEST.value },
  { id: SpaceTypes.CUSTOM.value },
  { id: SpaceTypes.STANDARD.value },
];

const TESTABLE_SPACES = INITIAL_SPACE_OPTIONS.map((option) => option.id);

// Wazuh: the root decoder lives on the draft space's policy, edited from its Overview,
// and reaches the test space when the draft space is promoted.
const SELECT_ROOT_DECODER_HREF = () =>
  buildAppUrl(INTEGRATIONS_NAV_ID, `${ROUTES.INTEGRATIONS}?space=${SpaceTypes.DRAFT.value}`);

interface SpaceCacheEntry {
  enabled: boolean;
  hasRootDecoder: boolean;
  integrations: LogTestIntegrationOption[];
}

type SpaceCache = Record<string, SpaceCacheEntry>;

const toReadiness = (entry?: SpaceCacheEntry): LogTestSpaceReadiness | undefined =>
  entry ? { hasRootDecoder: entry.hasRootDecoder, integrations: entry.integrations } : undefined;

interface LogTestProps extends Partial<RouteComponentProps> {
  notifications?: NotificationsStart;
}

export const LogTest: React.FC<LogTestProps> = ({ notifications, history }) => {
  // Wazuh: a link can open the page on a space, a scope and an integration
  // (`?space=test&scope=detection&integration=<id>`), e.g. the rules list's Test action.
  const [urlState] = useState(() =>
    readLogTestUrlState(history?.location?.search ?? '', TESTABLE_SPACES)
  );
  const [formData, setFormData] = useState<LogTestFormData>(() => ({
    ...INITIAL_FORM_DATA,
    space: urlState.space ?? INITIAL_FORM_DATA.space,
    integration: urlState.integration ?? '',
  }));
  const [scope, setScope] = useState<LogTestScope>(urlState.scope ?? 'full');
  // Wazuh: until the user (or a link) picks a scope, the page picks the first one that
  // can run in the space, so a space without a root decoder opens on Detection only.
  const scopeTouchedRef = useRef(!!urlState.scope);
  const [errors, setErrors] = useState<LogTestFormErrors>(INITIAL_ERRORS);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<LogTestResponse | null>(null);
  // Wazuh: the space and scope the result belongs to. The form can move after a test, and
  // the result (and its rule links) must keep describing what was actually evaluated.
  const [testedSpace, setTestedSpace] = useState<string | null>(null);
  const [testedScope, setTestedScope] = useState<LogTestScope>('full');
  const [lastNormalizedOutput, setLastNormalizedOutput] = useState<object | null>(null);
  const [spaceCache, setSpaceCache] = useState<SpaceCache>({});
  const [isSpaceCacheLoaded, setIsSpaceCacheLoaded] = useState(false);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.LOG_TEST]);
  }, []);

  const loadSpaceCache = useCallback(async (): Promise<SpaceCache> => {
    const entries = await Promise.all(
      INITIAL_SPACE_OPTIONS.map((option) =>
        DataStore.policies
          .searchPolicies(option.id, {
            includeIntegrationFields: [
              'document.id',
              'document.metadata',
              'document.enabled',
              // Wazuh: read only for its length, which the server returns as rulesCount.
              'document.rules',
            ],
          })
          .then((response): [string, SpaceCacheEntry] => {
            const policy = response.items[0];
            const integrations: LogTestIntegrationOption[] = Object.values(
              policy?.integrationsMap ?? {}
            )
              .filter((i) => i.document?.enabled)
              .map((i) => ({
                id: i.document?.id,
                label: i.document?.metadata?.title ?? i.document?.id,
                value: i.document?.metadata?.title ?? i.document?.id,
                rulesCount: i.document?.rulesCount ?? 0,
              }));
            return [
              option.id,
              {
                enabled: !!policy && policy.document?.enabled !== false,
                hasRootDecoder: !!policy?.document?.root_decoder,
                integrations,
              },
            ];
          })
          .catch((error): [string, SpaceCacheEntry] => {
            console.error(`Ruleset Management - LogTest - searchPolicies (${option.id}):`, error);
            errorNotificationToast(notifications, 'retrieve', 'policies', error);
            // Wazuh: unknown readiness must not block a scope, so this entry claims a
            // root decoder and leaves the Engine to answer for the space.
            return [option.id, { enabled: false, hasRootDecoder: true, integrations: [] }];
          })
      )
    );

    const cache: SpaceCache = Object.fromEntries(entries);
    setSpaceCache(cache);
    setIsSpaceCacheLoaded(true);
    return cache;
  }, [notifications]);

  useEffect(() => {
    loadSpaceCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disabledSpaces = useMemo<string[]>(
    () => INITIAL_SPACE_OPTIONS.filter((o) => spaceCache[o.id]?.enabled === false).map((o) => o.id),
    [spaceCache]
  );

  const integrationOptions = useMemo<LogTestIntegrationOption[]>(
    () => spaceCache[formData.space]?.integrations ?? [],
    [spaceCache, formData.space]
  );

  const scopeAvailability = useMemo(
    () => getScopeAvailability(toReadiness(spaceCache[formData.space])),
    [spaceCache, formData.space]
  );

  useEffect(() => {
    if (!scopeTouchedRef.current && spaceCache[formData.space]) {
      setScope(pickDefaultScope(scopeAvailability));
    }
  }, [scopeAvailability, spaceCache, formData.space]);

  // Wazuh: an integration from a link that is not in the space (or not enabled there)
  // would leave a combo box showing nothing while validation says it is set.
  useEffect(() => {
    if (!isSpaceCacheLoaded) return;
    setFormData((prev) =>
      prev.integration &&
      !(spaceCache[prev.space]?.integrations ?? []).some((i) => i.id === prev.integration)
        ? { ...prev, integration: '' }
        : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpaceCacheLoaded]);

  // Wazuh: a link to Log test opened while already on it changes only the URL, without
  // remounting the page, so the URL is followed here. The page's own writes below come
  // back through this listener too, and change nothing because they match the form.
  useEffect(() => {
    if (!history?.listen) return;
    return history.listen((location) => {
      const next = readLogTestUrlState(location.search, TESTABLE_SPACES);
      if (next.scope) {
        scopeTouchedRef.current = true;
        setScope(next.scope);
      }
      if (next.space || next.integration) {
        setFormData((prev) => {
          const space = next.space ?? prev.space;
          // A URL without an integration keeps the selected one (Normalization only
          // leaves it out) unless the space changed, which always drops it.
          const integration = next.integration ?? (space === prev.space ? prev.integration : '');
          return space === prev.space && integration === prev.integration
            ? prev
            : { ...prev, space, integration };
        });
      }
    });
  }, [history]);

  // Wazuh: keep the URL in step with the form, so the page can be bookmarked or shared
  // as it is, and every other param (dataSourceId) is kept.
  useEffect(() => {
    if (!history?.location) return;
    const search = writeLogTestUrlState(history.location.search, {
      space: formData.space,
      scope,
      integration: scope === 'normalization' ? undefined : formData.integration || undefined,
    });
    if (search !== history.location.search.replace(/^\?/, '')) {
      history.replace({ ...history.location, search });
    }
  }, [history, formData.space, formData.integration, scope]);

  const selectedScopeUnavailable = scopeAvailability[scope];
  const unavailableCallout = selectedScopeUnavailable
    ? describeUnavailableScope(selectedScopeUnavailable, formData.space, scopeAvailability)
    : undefined;

  const validateForm = useCallback((): Record<string, unknown> | false => {
    const newErrors: LogTestFormErrors = {};
    let input: Record<string, unknown> = {};

    if (scope !== 'detection' && !formData.event.trim()) {
      newErrors.event = 'Log event is required';
    }

    if (scope !== 'normalization') {
      const integration = integrationOptions.find((i) => i.id === formData.integration);
      if (!formData.integration) {
        newErrors.integration = 'Integration is required';
      } else if (scope === 'detection' && integration && integration.rulesCount === 0) {
        newErrors.integration = `This integration has no rules in the ${formData.space} space.`;
      }
    }

    if (scope === 'detection') {
      const parsed = parseNormalizedEvent(formData.normalizedEvent);
      if (parsed.value) input = parsed.value;
      else newErrors.normalizedEvent = parsed.error;
    }

    if (!formData.space) {
      newErrors.space = 'Space is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 ? input : false;
  }, [formData, scope, integrationOptions]);

  const handleExecuteLogTest = async () => {
    const input = validateForm();
    if (!input) {
      return;
    }

    setIsLoading(true);

    const rawEvent = {
      queue: 1, // temporary hardcoded queue value
      location: String(formData.location ?? '').trim(),
      event: formData.event.trim(),
      trace_level: formData.traceLevel,
      metadata: buildMetadataObject(formData.metadataFields),
      space: formData.space,
    };

    const result =
      scope === 'detection'
        ? await DataStore.logTests.executeDetection({
            document: { space: formData.space, integration: formData.integration, input },
          })
        : scope === 'normalization'
        ? await DataStore.logTests.executeNormalization({ document: rawEvent })
        : await DataStore.logTests.executeLogTest({
            document: { ...rawEvent, integration: formData.integration },
          });

    setIsLoading(false);

    if (result.success && result.data) {
      setTestResult(result.data);
      setTestedSpace(formData.space);
      setTestedScope(scope);
      const output = result.data.message?.normalization?.output;
      if (output) setLastNormalizedOutput(output);
    }
  };

  const clearError = useCallback((field: keyof LogTestFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleFormChange = useCallback(
    (field: keyof LogTestFormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        // Wazuh: an integration belongs to one space, so changing the space drops it. This
        // used to be an effect on the space, which also ran on mount and dropped the
        // integration a link had just selected.
        ...(field === 'space' && value !== prev.space ? { integration: '' } : {}),
      }));
      // clears error when user starts typing
      clearError(field as keyof LogTestFormErrors);
      if (field === 'space') clearError('integration');
    },
    [clearError]
  );

  const handleScopeChange = useCallback((nextScope: LogTestScope) => {
    scopeTouchedRef.current = true;
    setScope(nextScope);
    setErrors(INITIAL_ERRORS);
  }, []);

  const switchToDetection = useCallback(() => {
    handleScopeChange('detection');
    setTestResult(null);
  }, [handleScopeChange]);

  // Wazuh: the handoff keeps the integration when it has rules to evaluate, so a rule
  // author who started from the combined test lands one click away from re-running it.
  const handleTestDetectionWithOutput = useCallback(
    (output: object) => {
      setFormData((prev) => {
        const integration = integrationOptions.find((i) => i.id === prev.integration);
        return {
          ...prev,
          normalizedEvent: JSON.stringify(output, null, 2),
          integration: integration && integration.rulesCount > 0 ? prev.integration : '',
        };
      });
      switchToDetection();
    },
    [integrationOptions, switchToDetection]
  );

  const handleMetadataFieldsChange = useCallback((fields: MetadataEntry[]) => {
    setFormData((prev) => ({ ...prev, metadataFields: fields }));
  }, []);

  const handleClearSession = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors(INITIAL_ERRORS);
    setTestResult(null);
    setTestedSpace(null);
    setLastNormalizedOutput(null);
    scopeTouchedRef.current = false;
    setScope(
      pickDefaultScope(getScopeAvailability(toReadiness(spaceCache[INITIAL_FORM_DATA.space])))
    );
  }, [spaceCache]);

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
          <LogTestScopeSelector
            scope={scope}
            availability={scopeAvailability}
            space={formData.space}
            onChange={handleScopeChange}
            disabled={isLoading}
          />
          <EuiSpacer size="m" />
          {unavailableCallout && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                iconType="alert"
                title={unavailableCallout.title}
                data-test-subj="logTestScopeUnavailable"
              >
                <p>{unavailableCallout.body}</p>
                <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
                  {unavailableCallout.switchTo && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        color="warning"
                        onClick={() => handleScopeChange(unavailableCallout.switchTo!)}
                        data-test-subj="logTestSwitchScope"
                      >
                        {`Test ${
                          unavailableCallout.switchTo === 'detection'
                            ? 'detection'
                            : 'normalization'
                        } only`}
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  {selectedScopeUnavailable === 'no-root-decoder' && (
                    <EuiFlexItem grow={false}>
                      <EuiLink href={SELECT_ROOT_DECODER_HREF()} target="_blank" external>
                        Select a root decoder in the draft space
                      </EuiLink>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
          <LogTestForm
            formData={formData}
            errors={errors}
            onFormChange={handleFormChange}
            onMetadataFieldsChange={handleMetadataFieldsChange}
            integrationOptions={integrationOptions}
            isLoadingIntegrations={!isSpaceCacheLoaded}
            scope={scope}
            lastNormalizedOutput={lastNormalizedOutput}
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
                disabled={isLoading || !!selectedScopeUnavailable}
                data-test-subj="logTestRun"
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
                scope={testedScope}
                space={testedSpace ?? formData.space}
                onTestDetectionWithOutput={handleTestDetectionWithOutput}
                onSwitchToDetection={scopeAvailability.detection ? undefined : switchToDetection}
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
