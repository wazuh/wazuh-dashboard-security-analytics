/*
 * PROTOTYPE — throwaway. R5: Log test as a normalization debugger.
 * Same request and response payload as today; what changes is the interpretation
 * layer — a plain-language verdict instead of an HTTP status badge, fields as a
 * table with provenance, sample loaders, run history, and Draft rendered as
 * disabled-with-a-reason rather than silently absent.
 *
 * Hierarchy rule for this screen: the verdict is the biggest thing on the page,
 * the evidence sits under it, and the form is a quiet column beside it. Callouts
 * are reserved for states that need an explanation, not for the happy path.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiCompressedTextArea,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiInMemoryTable,
  EuiPageHeader,
  EuiPanel,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  EVALUATED_RULES,
  FieldRow,
  MATCHED_RULES,
  PARSED_FIELDS,
  RAW_RESPONSE,
  RunRecord,
  SAMPLE_EVENTS,
  SEED_RUNS,
  StageId,
  TRACE_LINES,
  stageById,
} from '../mockData';

interface Props {
  scopeBar?: React.ReactNode;
  stage: StageId;
  onStageChange: (stage: StageId) => void;
}

type Outcome = 'idle' | 'parsed' | 'unmatched' | 'error';

const ORIGIN_COLOR: Record<FieldRow['origin'], string> = {
  decoder: 'primary',
  enrichment: 'hollow',
  'raw event': 'default',
};

const RUN_COLOR: Record<RunRecord['outcome'], string> = {
  parsed: 'success',
  unmatched: 'subdued',
  error: 'danger',
};

export const LogTestScreen: React.FC<Props> = ({ stage, onStageChange, scopeBar }) => {
  const [event, setEvent] = useState('');
  const [location, setLocation] = useState('/var/log/auth.log');
  const [trace, setTrace] = useState('asset');
  const [outcome, setOutcome] = useState<Outcome>('idle');
  const [runs, setRuns] = useState<RunRecord[]>(SEED_RUNS);
  const [running, setRunning] = useState(false);

  const testable = stage !== 'draft';
  const decoderFieldCount = PARSED_FIELDS.filter((f) => f.origin === 'decoder').length;

  const run = () => {
    setRunning(true);
    window.setTimeout(() => {
      const text = event.toLowerCase();
      let next: Outcome = 'unmatched';
      let summary = 'no decoder matched';
      if (text.includes('boom')) {
        next = 'error';
        summary = 'request failed';
      } else if (text.includes('sshd') || text.includes('failed password')) {
        next = 'parsed';
        summary = `${decoderFieldCount} fields · 1 rule matched`;
      }
      setOutcome(next);
      setRuns((current) => [
        {
          id: (current[0]?.id ?? 0) + 1,
          at: 'just now',
          summary,
          outcome: next === 'error' ? 'error' : next === 'parsed' ? 'parsed' : 'unmatched',
        },
        ...current,
      ]);
      setRunning(false);
    }, 350);
  };

  const fieldColumns = [
    {
      field: 'field',
      name: 'Field',
      sortable: true,
      render: (value: string) => (
        <EuiText size="xs">
          <code>{value}</code>
        </EuiText>
      ),
    },
    {
      field: 'value',
      name: 'Value',
      render: (value: string) => (
        <EuiText size="xs">
          <code>{value}</code>
        </EuiText>
      ),
    },
    {
      field: 'origin',
      name: 'Produced by',
      width: '150px',
      sortable: true,
      render: (origin: FieldRow['origin']) => (
        <EuiBadge color={ORIGIN_COLOR[origin]}>{origin}</EuiBadge>
      ),
    },
  ];

  const resultTabs = [
    {
      id: 'fields',
      name: `Fields (${PARSED_FIELDS.length})`,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiInMemoryTable
            items={PARSED_FIELDS}
            columns={fieldColumns}
            search={{ box: { incremental: true, placeholder: 'Filter fields' } }}
            pagination={{ initialPageSize: 25, pageSizeOptions: [25, 50] }}
            sorting={true}
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            Grouping by origin answers the question a JSON dump cannot: which values your decoder
            produced, versus what was already there.
          </EuiText>
        </>
      ),
    },
    {
      id: 'detection',
      name: `Detection (${MATCHED_RULES.length})`,
      content: (
        <>
          <EuiSpacer size="m" />
          {MATCHED_RULES.map((rule) => (
            <EuiPanel key={rule.name} hasBorder={true} hasShadow={false} paddingSize="m">
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">{rule.level}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h4>{rule.cleanName}</h4>
                  </EuiTitle>
                  <EuiText size="xs" color="subdued">
                    Stored title <code>{rule.name}</code> — placeholders resolved for display
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{rule.technique}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ))}
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            {EVALUATED_RULES.length} rules evaluated, {MATCHED_RULES.length} matched.
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap={true} responsive={false}>
            {EVALUATED_RULES.map((name) => (
              <EuiFlexItem grow={false} key={name}>
                <EuiBadge color="default">{name}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ),
    },
    {
      id: 'trace',
      name: 'Trace',
      content: (
        <>
          <EuiSpacer size="m" />
          {TRACE_LINES.map((line, index) => (
            <React.Fragment key={index}>
              <EuiText size="xs">
                <EuiHealth color={line.outcome === 'success' ? 'success' : 'danger'}>
                  <code>
                    {line.decoder} · {line.step}
                  </code>
                </EuiHealth>
              </EuiText>
              <EuiText size="xs" color="subdued" style={{ paddingLeft: 20 }}>
                {line.detail}
              </EuiText>
              <EuiSpacer size="xs" />
            </React.Fragment>
          ))}
        </>
      ),
    },
    {
      id: 'raw',
      name: 'Raw JSON',
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="json" paddingSize="m" isCopyable={true} overflowHeight={340}>
            {RAW_RESPONSE}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  const stageOptions = [
    { id: 'test', label: 'Test' },
    { id: 'custom', label: 'Custom' },
    { id: 'standard', label: 'Standard' },
    { id: 'draft', label: 'Draft', isDisabled: true },
  ];

  return (
    <>
      <EuiPageHeader
        pageTitle="Log test"
        description="Paste a real event and see which decoder claims it, which fields it produces, and which rules fire."
        bottomBorder={true}
      />
      {scopeBar}
      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        {/* ------------------------------------------------------------- form */}
        <EuiFlexItem grow={false} style={{ width: 360 }}>
          <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
            <EuiCompressedFormRow
              label="Testing against"
              fullWidth={true}
              helpText={
                testable
                  ? 'Draft is not loaded into the engine, so it cannot be evaluated. Promote it to Test to try it.'
                  : undefined
              }
            >
              <EuiButtonGroup
                legend="Stage to test against"
                options={stageOptions}
                idSelected={stage}
                onChange={(id) => onStageChange(id as StageId)}
                buttonSize="compressed"
                isFullWidth={true}
              />
            </EuiCompressedFormRow>

            {!testable && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut size="s" color="warning" title="Draft cannot be evaluated">
                  <EuiText size="xs">
                    Draft content is not loaded into the engine. The stage designed for iteration is
                    the one stage where iteration is impossible.
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiSmallButton color="warning" onClick={() => onStageChange('test')}>
                    Test against Test instead
                  </EuiSmallButton>
                </EuiCallOut>
              </>
            )}

            <EuiHorizontalRule margin="m" />

            <EuiCompressedFormRow label="Log event" fullWidth={true}>
              <EuiCompressedTextArea
                fullWidth={true}
                rows={6}
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Paste one raw event"
                aria-label="Log event"
              />
            </EuiCompressedFormRow>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty
                  size="xs"
                  flush="left"
                  iconType="documentEdit"
                  onClick={() => setEvent(SAMPLE_EVENTS['system-auth'])}
                >
                  Load sample
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty size="xs" flush="left" iconType="indexOpen">
                  Load from index
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />
            <EuiCompressedFormRow label="Location" fullWidth={true}>
              <EuiCompressedFieldText
                fullWidth={true}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </EuiCompressedFormRow>
            <EuiCompressedFormRow
              label="Trace level"
              fullWidth={true}
              helpText="A diagnostic tool should start with diagnostics on."
            >
              <EuiCompressedSelect
                fullWidth={true}
                value={trace}
                onChange={(e) => setTrace(e.target.value)}
                options={[
                  { value: 'asset', text: 'Asset only' },
                  { value: 'all', text: 'All assets' },
                  { value: 'none', text: 'None' },
                ]}
              />
            </EuiCompressedFormRow>

            <EuiSpacer size="l" />
            <EuiSmallButton
              fill={true}
              fullWidth={true}
              iconType="play"
              isLoading={running}
              disabled={!testable || event.trim().length === 0}
              onClick={run}
            >
              Run test
            </EuiSmallButton>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
            <EuiTitle size="xxs">
              <h3>Recent runs</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {runs.slice(0, 6).map((record, index) => (
              <React.Fragment key={record.id}>
                {index > 0 && <EuiSpacer size="xs" />}
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="baseline">
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {record.at}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <EuiHealth color={RUN_COLOR[record.outcome]}>{record.summary}</EuiHealth>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </React.Fragment>
            ))}
          </EuiPanel>
        </EuiFlexItem>

        {/* ----------------------------------------------------------- result */}
        <EuiFlexItem>
          {outcome === 'idle' && (
            <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
              <EuiEmptyPrompt
                iconType="inspect"
                title={<h2>Nothing tested yet</h2>}
                body={
                  <EuiText size="s">
                    Paste an event, or load a sample, then run the test. The verdict appears here —
                    which decoder claimed the event, what it produced, and which rules fired.
                  </EuiText>
                }
                actions={
                  <EuiSmallButton
                    iconType="documentEdit"
                    onClick={() => setEvent(SAMPLE_EVENTS['system-auth'])}
                  >
                    Load sample event
                  </EuiSmallButton>
                }
              />
            </EuiPanel>
          )}

          {outcome === 'parsed' && (
            <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkInCircleFilled" color="success" size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>Parsed successfully</h2>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    Matched <code>decoder/system-auth/0</code> · {decoderFieldCount} fields mapped
                    by the decoder · classified as <strong>system-auth</strong> ·{' '}
                    {MATCHED_RULES.length} of {EVALUATED_RULES.length} rules matched
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSmallButtonEmpty iconType="pencil">Edit this decoder</EuiSmallButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule margin="m" />
              <EuiTabbedContent tabs={resultTabs} initialSelectedTab={resultTabs[0]} size="s" />
            </EuiPanel>
          )}

          {outcome === 'unmatched' && (
            <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="questionInCircle" color="warning" size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>No decoder claimed this event</h2>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    {EVALUATED_RULES.length} decoders in {stageById(stage).label} were evaluated and
                    none matched — which is different from an event that parsed but produced no
                    fields.
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule margin="m" />
              <EuiText size="s">
                Closest miss: <code>decoder/system-auth/0</code>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                Its check requires the event to start with a syslog timestamp.
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
                <EuiFlexItem grow={false}>
                  <EuiSmallButton iconType="plusInCircle">
                    Create a decoder for this event
                  </EuiSmallButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSmallButtonEmpty iconType="inspect">
                    Show which checks failed
                  </EuiSmallButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          )}

          {outcome === 'error' && (
            <EuiPanel hasBorder={true} hasShadow={false} paddingSize="l">
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="alert" color="danger" size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>Test could not run</h2>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    The engine returned no response. The previous result has been cleared so it
                    cannot be mistaken for this run.
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="m" />
              <EuiText size="s">
                Check that the {stageById(stage).label} policy is enabled, then run the test again.
              </EuiText>
              <EuiSpacer size="m" />
              <EuiSmallButton color="danger" iconType="refresh" onClick={run}>
                Retry
              </EuiSmallButton>
            </EuiPanel>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </>
  );
};
