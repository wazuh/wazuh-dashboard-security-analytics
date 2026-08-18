/*
 * PROTOTYPE — throwaway. R2: the landing page the module lacks.
 * Answers, without a click: what state is my pipeline in, what is blocking me,
 * what should I do next. Today's "Overview" is the Integrations table.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageHeader,
  EuiPanel,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  BLOCKERS,
  COVERAGE,
  GETTING_STARTED,
  PIPELINE,
  REFERENCE_STAGE,
  StageId,
} from '../mockData';
import { ScreenId } from '../prototypeState';

interface Props {
  /** Rendered directly under the page header: page identity first, scope second. */
  scopeBar?: React.ReactNode;
  stage: StageId;
  onNavigate: (screen: ScreenId) => void;
  onStageChange: (stage: StageId) => void;
}

const HEALTH_COLOR = {
  ready: 'success',
  blocked: 'danger',
  active: 'primary',
} as const;

const PipelineCard: React.FC<{
  label: string;
  state: string;
  detail: string;
  tone: 'ready' | 'blocked' | 'active';
  selected: boolean;
  onClick: () => void;
}> = ({ label, state, detail, tone, selected, onClick }) => (
  <EuiPanel
    element="button"
    hasBorder={true}
    hasShadow={false}
    paddingSize="m"
    color={selected ? 'primary' : 'plain'}
    onClick={onClick}
    aria-current={selected}
    style={{ width: '100%', height: '100%', textAlign: 'left' }}
  >
    <EuiTitle size="xxs">
      <h3>{label}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s">
      <EuiHealth color={HEALTH_COLOR[tone]}>
        <strong>{state}</strong>
      </EuiHealth>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="xs" color="subdued">
      {detail}
    </EuiText>
  </EuiPanel>
);

export const OverviewScreen: React.FC<Props> = ({ stage, onNavigate, onStageChange, scopeBar }) => {
  const detail: Record<string, string> = {
    draft: '2 integrations · 3 decoders · 1 rule',
    test: '1 integration · 1 decoder · 0 rules',
    custom: '4 integrations · 9 decoders · 6 rules',
  };

  return (
    <>
      <EuiPageHeader
        pageTitle="Overview"
        description="Pipeline state, what is blocking promotion, and whether your detections are producing anything."
        rightSideItems={[
          <EuiSmallButtonEmpty iconType="documentation" href="#">
            Documentation
          </EuiSmallButtonEmpty>,
        ]}
        bottomBorder={true}
      />
      {scopeBar}
      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h2>Content pipeline</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={true}>
        {PIPELINE.map((s) => (
          <EuiFlexItem key={s.id}>
            <PipelineCard
              label={s.label}
              state={s.state}
              detail={detail[s.id]}
              tone={s.health as 'ready' | 'blocked' | 'active'}
              selected={stage === s.id}
              onClick={() => onStageChange(s.id)}
            />
          </EuiFlexItem>
        ))}
        <EuiFlexItem>
          <EuiPanel
            element="button"
            hasBorder={true}
            hasShadow={false}
            paddingSize="m"
            color={stage === 'standard' ? 'primary' : 'subdued'}
            onClick={() => onStageChange('standard')}
            aria-current={stage === 'standard'}
            style={{ width: '100%', height: '100%', textAlign: 'left' }}
          >
            <EuiTitle size="xxs">
              <h3>Standard</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <EuiHealth color="subdued">
                <strong>{REFERENCE_STAGE.state}</strong>
              </EuiHealth>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              Built-in, read-only — not a stage
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>Needs attention</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      {BLOCKERS.map((blocker) => (
        <React.Fragment key={blocker.id}>
          <EuiCallOut
            title={blocker.title}
            color={blocker.tone === 'warning' ? 'warning' : 'primary'}
            iconType={blocker.tone === 'warning' ? 'alert' : 'iInCircle'}
            size="s"
          >
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">{blocker.body}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  color={blocker.tone === 'warning' ? 'warning' : 'primary'}
                  onClick={() => blocker.goTo && onNavigate(blocker.goTo)}
                >
                  {blocker.actionLabel}
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h2>Detection coverage</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
        <EuiFlexGroup responsive={true}>
          <EuiFlexItem>
            <EuiStat
              title={String(COVERAGE.activeDetectors)}
              description="Active detectors"
              titleSize="l"
              textAlign="left"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={String(COVERAGE.rulesInCustom)}
              description="Rules in Custom"
              titleSize="l"
              textAlign="left"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={COVERAGE.eventsLast24h.toLocaleString('en-US')}
              description="Events processed (24 h)"
              titleSize="l"
              textAlign="left"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={String(COVERAGE.silentDetectors)}
              description="Detectors with 0 matches (7 d)"
              titleSize="l"
              titleColor="danger"
              textAlign="left"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="iInCircle" size="s" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              A detector that has never matched is usually a field mapping problem. This is the
              clearest signal the module can give, and the one it does not surface today.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {stage === 'draft' && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h2>Getting started</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={3} gutterSize="m">
            {GETTING_STARTED.map((card, index) => (
              <EuiFlexItem key={card.title}>
                <EuiCard
                  icon={<EuiIcon size="xl" type={card.icon} />}
                  title={`${index + 1}. ${card.title}`}
                  description={card.body}
                  footer={
                    <EuiSmallButton
                      onClick={() => onNavigate(index === 2 ? 'logtest' : 'decoders')}
                    >
                      {card.action}
                    </EuiSmallButton>
                  }
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}
    </>
  );
};
