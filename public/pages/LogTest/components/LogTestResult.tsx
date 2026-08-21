/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useMemo, useState } from 'react';
import {
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCallOut,
  EuiTabs,
  EuiTab,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import {
  LogTestResponse,
  LogTestAssetTrace,
  LogTestNormalizationResult,
  LogTestDetectionResult,
  LogTestDetectionRuleMatch,
  LogTestValidationError,
} from '../../../../types';
import { buildLogTestVerdict, countNormalizedFields } from '../utils';

export interface LogTestResultProps {
  result: LogTestResponse;
  ruleHref?: (ruleId: string) => string;
}

const AssetTraceItem: React.FC<{ trace: LogTestAssetTrace; index: number }> = ({
  trace,
  index,
}) => {
  return (
    <EuiAccordion
      id={`asset-trace-${index}`}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBadge color={trace.success ? 'success' : 'danger'}>
              {trace.success ? 'Success' : 'Failed'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <code>{trace.asset}</code>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="s"
    >
      {trace.traces && trace.traces.length > 0 ? (
        <EuiCodeBlock language="text" paddingSize="s" fontSize="s" isCopyable>
          {trace.traces.join('\n')}
        </EuiCodeBlock>
      ) : (
        <EuiText size="s" color="subdued">
          No trace details available. Traces are only returned when the test runs with a trace level
          above none.
        </EuiText>
      )}
    </EuiAccordion>
  );
};

const ValidationErrorItem: React.FC<{
  error: LogTestValidationError;
  index: number;
}> = ({ error, index }) => {
  const listItems = Object.entries(error)
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({
      title: <span style={{ textTransform: 'capitalize' }}>{key}</span>,
      description: String(value),
    }));

  return (
    <EuiAccordion
      id={`validation-error-${index}`}
      initialIsOpen={false}
      buttonContent={
        <EuiText size="s">
          <code>{error.path}</code>
        </EuiText>
      }
      paddingSize="none"
    >
      <div style={{ padding: '8px 12px 4px' }}>
        <EuiPanel color="subdued" paddingSize="s" hasShadow={false} hasBorder={false}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr',
              rowGap: 8,
            }}
          >
            {listItems.map(({ title, description }, i) => (
              <React.Fragment key={i}>
                <EuiText size="s">
                  <strong>{title}</strong>
                </EuiText>
                <EuiText size="s">{description}</EuiText>
              </React.Fragment>
            ))}
          </div>
        </EuiPanel>
      </div>
    </EuiAccordion>
  );
};

function getLevelBadgeColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'default';
    default:
      return 'hollow';
  }
}

const DetectionMatchItem: React.FC<{
  match: LogTestDetectionRuleMatch;
  index: number;
  ruleHref?: (ruleId: string) => string;
}> = ({ match, index, ruleHref }) => {
  const { rule, matched_conditions } = match;

  return (
    <EuiAccordion
      id={`detection-match-${index}`}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBadge color={getLevelBadgeColor(rule.level)}>{rule.level}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{rule.title}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      /* Wazuh: the link lives here, not in buttonContent. EuiAccordion renders
         buttonContent inside a <button>, so an anchor there was nested in a button:
         invalid markup, and the click fought the accordion toggle. extraAction is
         rendered as a sibling of that button. */
      extraAction={
        ruleHref ? (
          <EuiToolTip content="View this rule in a new tab">
            <EuiButtonEmpty
              size="xs"
              flush="right"
              iconType="popout"
              iconSide="right"
              href={ruleHref(rule.id)}
              target="_blank"
            >
              View this rule
            </EuiButtonEmpty>
          </EuiToolTip>
        ) : undefined
      }
      paddingSize="s"
    >
      <EuiText size="xs" color="subdued">
        <strong>ID:</strong> {rule.id}
      </EuiText>
      <EuiSpacer size="xs" />
      {rule.tags && rule.tags.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="xs" wrap>
            {rule.tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      {matched_conditions && matched_conditions.length > 0 && (
        <>
          <EuiText size="xs" color="subdued">
            <strong>Matched conditions:</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {matched_conditions.map((condition, i) => (
              <li key={i}>
                <EuiText size="s">
                  <code>{condition}</code>
                </EuiText>
              </li>
            ))}
          </ul>
        </>
      )}
    </EuiAccordion>
  );
};

const NormalizationSection: React.FC<{ data: LogTestNormalizationResult }> = ({ data }) => {
  const formattedOutput = useMemo(() => {
    if (data?.output) {
      return JSON.stringify(data.output, null, 2);
    }
    return null;
  }, [data?.output]);

  const hasAssetTraces = data?.asset_traces && data.asset_traces.length > 0;
  const hasValidation = data?.validation != null;

  if (data.status === 'error') {
    return (
      <EuiCallOut title="Normalization error" color="danger" iconType="alert">
        <p>{data.error?.message ?? 'An unexpected error occurred during normalization.'}</p>
      </EuiCallOut>
    );
  }

  return (
    <>
      {formattedOutput ? (
        <EuiPanel paddingSize="none">
          <EuiCodeBlock language="json" paddingSize="m" isCopyable overflowHeight={400}>
            {formattedOutput}
          </EuiCodeBlock>
        </EuiPanel>
      ) : (
        <EuiCallOut title="No output" color="warning" iconType="alert">
          <p>The logtest did not return any output.</p>
        </EuiCallOut>
      )}

      {hasAssetTraces && (
        <>
          <EuiSpacer size="l" />
          <EuiAccordion
            id="asset-traces-section"
            initialIsOpen={false}
            buttonContent={
              <EuiText size="s">
                <h4>Asset Traces</h4>
              </EuiText>
            }
            paddingSize="s"
          >
            <EuiSpacer size="s" />
            <EuiPanel paddingSize="m">
              {data.asset_traces!.map((trace, index) => (
                <React.Fragment key={`${trace.asset}-${index}`}>
                  {index > 0 && <EuiSpacer size="s" />}
                  <AssetTraceItem trace={trace} index={index} />
                </React.Fragment>
              ))}
            </EuiPanel>
          </EuiAccordion>
        </>
      )}

      {hasValidation && !data.validation!.valid && (
        <>
          <EuiSpacer size="l" />
          <EuiAccordion
            id="validation-section"
            initialIsOpen
            buttonContent={
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="s">
                    <h4>Validation</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">Failed</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            paddingSize="s"
          >
            {data.validation!.errors.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiPanel paddingSize="m">
                  {data.validation!.errors.map((error, index) => (
                    <React.Fragment key={`${error.path}-${error.kind}-${index}`}>
                      {index > 0 && <EuiSpacer size="s" />}
                      <ValidationErrorItem error={error} index={index} />
                    </React.Fragment>
                  ))}
                </EuiPanel>
              </>
            )}
          </EuiAccordion>
        </>
      )}
    </>
  );
};

const DetectionSection: React.FC<{
  data: LogTestDetectionResult;
  ruleHref?: (ruleId: string) => string;
}> = ({ data, ruleHref }) => {
  if (data.status === 'skipped') {
    return (
      <EuiCallOut title="Detection skipped" color="warning" iconType="alert">
        <p>{data.reason || 'Detection was skipped.'}</p>
      </EuiCallOut>
    );
  }

  if (data.status === 'error') {
    return (
      <EuiCallOut title="Detection error" color="danger" iconType="alert">
        <p>{data.reason || 'Detection failed due to an unexpected error.'}</p>
      </EuiCallOut>
    );
  }

  const matches = data.matches ?? [];

  if (matches.length === 0) {
    // Wazuh: the payload only distinguishes these two by rules_evaluated, and reporting
    // "0 rules evaluated, 0 matched" for both hid the difference.
    const noneEvaluated = data.rules_evaluated === 0;
    return (
      <EuiCallOut
        title={noneEvaluated ? 'No rules were evaluated' : 'No rules matched'}
        color="primary"
        iconType="iInCircle"
      >
        <p>
          {noneEvaluated
            ? 'The detection logic ran with no rules to evaluate, so nothing could match.'
            : data.rules_evaluated != null
            ? `${data.rules_evaluated} rules were evaluated and none matched this event.`
            : 'No rules matched this event.'}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText size="s">
        <p>
          <strong>{data.rules_evaluated}</strong> rules evaluated,{' '}
          <strong>{data.rules_matched}</strong> matched
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        {matches.map((match, index) => (
          <React.Fragment key={`${match.rule.id}-${index}`}>
            {index > 0 && <EuiSpacer size="s" />}
            <DetectionMatchItem match={match} index={index} ruleHref={ruleHref} />
          </React.Fragment>
        ))}
      </EuiPanel>
    </>
  );
};

type ResultTab = 'normalization' | 'detection';

export const LogTestResult: React.FC<LogTestResultProps> = ({ result, ruleHref }) => {
  const [selectedTab, setSelectedTab] = useState<ResultTab>('normalization');
  const normalization = result?.message?.normalization;
  const detection = result?.message?.detection;
  const verdict = useMemo(
    () =>
      buildLogTestVerdict({
        normalizationStatus: normalization?.status,
        detectionStatus: detection?.status,
        fieldCount: countNormalizedFields(normalization?.output),
        rulesMatched: detection?.matches?.length ?? 0,
      }),
    [normalization?.status, normalization?.output, detection?.status, detection?.matches]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h3>Test Result</h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* Wazuh: the engine's raw status code (often just "200") told the user nothing,
              so this states the outcome instead. */}
          <EuiBadge color={verdict.color}>{verdict.text}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiTabs size="s">
        <EuiTab
          isSelected={selectedTab === 'normalization'}
          onClick={() => setSelectedTab('normalization')}
        >
          Normalization
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'detection'}
          onClick={() => setSelectedTab('detection')}
        >
          Detection
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'normalization' &&
        (normalization ? (
          <NormalizationSection data={normalization} />
        ) : (
          <EuiCallOut title="No normalization data" color="primary" iconType="iInCircle">
            <p>The logtest did not return normalization results.</p>
          </EuiCallOut>
        ))}

      {selectedTab === 'detection' &&
        (detection ? (
          <DetectionSection data={detection} ruleHref={ruleHref} />
        ) : (
          <EuiCallOut title="No detection data" color="primary" iconType="iInCircle">
            <p>The logtest did not return detection results.</p>
          </EuiCallOut>
        ))}
    </>
  );
};
