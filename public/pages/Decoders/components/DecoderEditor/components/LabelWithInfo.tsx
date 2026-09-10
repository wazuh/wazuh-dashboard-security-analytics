/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export interface LabelWithInfoProps {
  /** The field label, already built by `fieldLabel`. */
  label: React.ReactNode;
  /** Heading inside the popover. */
  title: string;
  /** Reference material — what the options mean, not how to type them. */
  children: React.ReactNode;
  /** Names the button for screen readers, e.g. "Check format information". */
  ariaLabel: string;
}

/**
 * The filter form's info button beside a label. For reference material; guidance
 * needed while typing stays inline as `helpText`.
 */
export const LabelWithInfo: React.FC<LabelWithInfoProps> = ({
  label,
  title,
  children,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="iInCircle"
              aria-label={ariaLabel}
              onClick={() => setIsOpen(!isOpen)}
              color="primary"
              size="xs"
              data-test-subj={`info-${ariaLabel.replace(/\s+/g, '-').toLowerCase()}`}
            />
          }
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          anchorPosition="downRight"
        >
          <div style={{ minWidth: '300px', maxWidth: '480px' }}>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
            <EuiSpacer size="s" />
            <div style={{ paddingLeft: '16px' }}>{children}</div>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * A worked example inside a popover. Captioned, so it does not read as a
 * sentence that lost its verb, and kept outside `EuiText` so it does not pick up
 * the code-block fill.
 */
export const Example: React.FC<{ caption?: string; children: string }> = ({
  caption = 'Example',
  children,
}) => (
  <>
    <EuiText size="xs" color="subdued" style={{ marginTop: '6px' }}>
      <strong>{caption}</strong>
    </EuiText>
    <pre style={{ margin: '2px 0 8px 0', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
      {children}
    </pre>
  </>
);

/** One labelled paragraph inside a popover. */
export const InfoItem: React.FC<{ term: string; children: React.ReactNode }> = ({
  term,
  children,
}) => (
  <>
    <EuiText size="xs">
      <p>
        <strong>{term}:</strong> {children}
      </p>
    </EuiText>
    <EuiSpacer size="s" />
  </>
);
