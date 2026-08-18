/*
 * PROTOTYPE — throwaway. R1: three radically different homes for the stage control.
 *   A — a panel at the top of the page (directional, always visible)
 *   B — a pill in the global header, detail behind a popover (setHeaderActionMenu)
 *   C — a vertical pipeline at the top of the left rail, nav nested under it
 * All three share one rule the current UI breaks: Standard is not a fourth stage.
 *
 * Styling rule for this file: no hex colours, no raw gaps. Every dot, spacing and
 * surface comes from an OUI component so it inherits the theme and the spacing
 * scale — which is the same argument R6 makes about page chrome.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { PIPELINE, REFERENCE_STAGE, StageId, StageInfo, stageById } from './mockData';

/** Health maps to OUI's semantic colour names, never to literals. */
const HEALTH_COLOR: Record<StageInfo['health'], string> = {
  ready: 'success',
  blocked: 'danger',
  active: 'primary',
  reference: 'subdued',
};

interface ControlProps {
  stage: StageId;
  onStageChange: (stage: StageId) => void;
  onReview: () => void;
}

/* ------------------------------------------------------------------ shared */

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="xs" color="subdued">
    <strong>{children}</strong>
  </EuiText>
);

/** The one sentence the current UI never says: what stage you are writing into. */
export const StageContextStrip: React.FC<{ stage: StageId }> = ({ stage }) => {
  const info = stageById(stage);
  const copy: Record<StageId, string> = {
    draft: 'Editing in Draft — changes are not active until promoted',
    test: 'Editing in Test — content is loaded in the engine for validation only',
    custom: 'Editing in Custom — changes take effect on all incoming events',
    standard: 'Viewing Standard — built-in content, read-only',
  };
  return (
    <EuiText size="xs" color="subdued">
      <EuiHealth color={HEALTH_COLOR[info.health]}>{copy[stage]}</EuiHealth>
    </EuiText>
  );
};

const ReferenceButton: React.FC<ControlProps & { compact?: boolean }> = ({
  stage,
  onStageChange,
  compact,
}) => (
  <EuiToolTip content={REFERENCE_STAGE.meaning}>
    <EuiSmallButtonEmpty
      flush="both"
      iconType="documents"
      onClick={() => onStageChange(stage === 'standard' ? 'draft' : 'standard')}
      color={stage === 'standard' ? 'primary' : 'text'}
    >
      {compact ? 'Wazuh built-in content' : `Wazuh built-in content · ${REFERENCE_STAGE.state}`}
    </EuiSmallButtonEmpty>
  </EuiToolTip>
);

/* ---------------------------------------------------------------- variant A */

const StageChip: React.FC<{
  info: StageInfo;
  selected: boolean;
  onClick: () => void;
}> = ({ info, selected, onClick }) => (
  <EuiToolTip content={info.meaning}>
    <EuiPanel
      element="button"
      onClick={onClick}
      hasShadow={false}
      hasBorder={selected}
      color={selected ? 'primary' : 'transparent'}
      paddingSize="s"
      aria-current={selected}
      style={{ minWidth: 156, textAlign: 'left' }}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <EuiHealth color={HEALTH_COLOR[info.health]}>
              <strong>{info.label}</strong>
            </EuiHealth>
          </EuiText>
        </EuiFlexItem>
        {info.pending > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{info.pending}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {info.state}
      </EuiText>
    </EuiPanel>
  </EuiToolTip>
);

export const StageRibbon: React.FC<ControlProps> = (props) => {
  const { stage, onStageChange, onReview } = props;
  return (
    <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={true} wrap={true}>
        <EuiFlexItem grow={false}>
          <Eyebrow>Working in</Eyebrow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {PIPELINE.map((info, index) => (
              <React.Fragment key={info.id}>
                {index > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="arrowRight" color="subdued" size="s" />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <StageChip
                    info={info}
                    selected={stage === info.id}
                    onClick={() => onStageChange(info.id)}
                  />
                </EuiFlexItem>
              </React.Fragment>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true} />

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <Eyebrow>Reference</Eyebrow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ReferenceButton {...props} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSmallButton iconType="arrowRight" iconSide="right" onClick={onReview}>
            Review &amp; promote
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <StageContextStrip stage={stage} />
    </EuiPanel>
  );
};

/* ---------------------------------------------------------------- variant B */

export const StageHeaderPill: React.FC<ControlProps> = (props) => {
  const { stage, onStageChange, onReview } = props;
  const [open, setOpen] = useState(false);
  const info = stageById(stage);

  const button = (
    <EuiButtonEmpty
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setOpen(!open)}
      aria-label={`Working in ${info.label}. Change stage`}
    >
      <EuiHealth color={HEALTH_COLOR[info.health]}>{info.label}</EuiHealth>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={open}
      closePopover={() => setOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="m"
    >
      <div style={{ width: 320 }}>
        <EuiTitle size="xxs">
          <h4>Content pipeline</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {PIPELINE.map((s, index) => (
          <React.Fragment key={s.id}>
            {index > 0 && <EuiSpacer size="xs" />}
            <EuiPanel
              element="button"
              onClick={() => {
                onStageChange(s.id);
                setOpen(false);
              }}
              hasShadow={false}
              hasBorder={stage === s.id}
              color={stage === s.id ? 'primary' : 'transparent'}
              paddingSize="s"
              aria-current={stage === s.id}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {index + 1}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <EuiHealth color={HEALTH_COLOR[s.health]}>
                      <strong>{s.label}</strong>
                    </EuiHealth>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {s.state}
                  </EuiText>
                </EuiFlexItem>
                {s.pending > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{s.pending}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          </React.Fragment>
        ))}

        <EuiHorizontalRule margin="s" />
        <Eyebrow>Reference</Eyebrow>
        <EuiSpacer size="xs" />
        <ReferenceButton {...props} compact={true} />
        <EuiHorizontalRule margin="s" />
        <EuiSmallButton
          fullWidth={true}
          iconType="arrowRight"
          iconSide="right"
          onClick={() => {
            onReview();
            setOpen(false);
          }}
        >
          Review &amp; promote 3 changes
        </EuiSmallButton>
      </div>
    </EuiPopover>
  );
};

/* ---------------------------------------------------------------- variant C */

export const StageLeftRail: React.FC<ControlProps> = (props) => {
  const { stage, onStageChange, onReview } = props;
  return (
    <>
      <Eyebrow>Working in</Eyebrow>
      <EuiSpacer size="xs" />
      {PIPELINE.map((s, index) => (
        <React.Fragment key={s.id}>
          {index > 0 && <EuiSpacer size="xs" />}
          <EuiPanel
            element="button"
            onClick={() => onStageChange(s.id)}
            hasShadow={false}
            hasBorder={stage === s.id}
            color={stage === s.id ? 'primary' : 'transparent'}
            paddingSize="s"
            aria-current={stage === s.id}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <EuiText size="s">
              <EuiHealth color={HEALTH_COLOR[s.health]}>
                <strong>{s.label}</strong>
              </EuiHealth>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {s.state}
            </EuiText>
          </EuiPanel>
        </React.Fragment>
      ))}
      <EuiSpacer size="xs" />
      <EuiSmallButtonEmpty
        size="xs"
        flush="left"
        iconType="arrowRight"
        iconSide="right"
        onClick={onReview}
      >
        Review &amp; promote
      </EuiSmallButtonEmpty>

      <EuiHorizontalRule margin="m" />
      <Eyebrow>Reference</Eyebrow>
      <EuiSpacer size="xs" />
      <EuiPanel
        element="button"
        onClick={() => onStageChange('standard')}
        hasShadow={false}
        hasBorder={stage === 'standard'}
        color={stage === 'standard' ? 'primary' : 'transparent'}
        paddingSize="s"
        aria-current={stage === 'standard'}
        style={{ width: '100%', textAlign: 'left' }}
      >
        <EuiText size="s">
          <EuiHealth color="subdued">
            <strong>{REFERENCE_STAGE.label}</strong>
          </EuiHealth>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {REFERENCE_STAGE.state} · read-only
        </EuiText>
      </EuiPanel>
      <EuiHorizontalRule margin="m" />
    </>
  );
};
