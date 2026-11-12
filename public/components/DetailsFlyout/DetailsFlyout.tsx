/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Building blocks shared by the Rule, Decoder, KVDB and Filter details flyouts, so the
 * four read as one family: title as the heading, a status row next to the
 * Visual / YAML / JSON switch, a compact overview and collapsible sections.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiLink,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { formatUIDate } from '../../utils/dateFormat';

export const DETAILS_VIEW_OPTIONS = [
  { id: 'visual', label: 'Visual' },
  { id: 'yaml', label: 'YAML' },
  { id: 'json', label: 'JSON' },
];

// Asset dates are usually date-only (`2026-07-28`); formatting them with the
// `dateFormat` setting would print a meaningless `@ 00:00:00.000`. Parsed as local
// midnight so the day does not shift with the timezone.
export const formatDetailsDate = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : value && formatUIDate(value);

export const DetailsFlyoutHeader: React.FC<{
  eyebrow: string;
  title?: string;
  titleId: string;
  onClose: () => void;
  closeButtonTestSubj: string;
}> = ({ eyebrow, title, titleId, onClose, closeButtonTestSubj }) => (
  <EuiFlyoutHeader hasBorder>
    <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        {title && (
          <EuiText size="xs" color="subdued">
            {eyebrow}
          </EuiText>
        )}
        <EuiTitle size="m">
          <h2 id={titleId}>{title || eyebrow}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSmallButtonIcon
          aria-label="close"
          iconType="cross"
          display="empty"
          iconSize="m"
          onClick={onClose}
          data-test-subj={closeButtonTestSubj}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlyoutHeader>
);

/** A hollow badge that names its value, e.g. `Space: draft`. */
export const LabeledBadge: React.FC<{ label: string; value?: string; testSubj?: string }> = ({
  label,
  value,
  testSubj,
}) =>
  value ? (
    <EuiBadge color="hollow" data-test-subj={testSubj}>
      {label}: {value}
    </EuiBadge>
  ) : null;

/** Status items (Enabled, badges) on the left, the Visual / YAML / JSON switch on the right. */
export const DetailsToolbar: React.FC<{
  status?: React.ReactNode[];
  selectedView: string;
  onChangeView: (id: string) => void;
  viewSwitchTestSubj: string;
  viewSwitchLegend: string;
  isDisabled?: boolean;
}> = ({
  status = [],
  selectedView,
  onChangeView,
  viewSwitchTestSubj,
  viewSwitchLegend,
  isDisabled,
}) => (
  <>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
          {status.filter(Boolean).map((item, i) => (
            <EuiFlexItem grow={false} key={i}>
              {item}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          data-test-subj={viewSwitchTestSubj}
          legend={viewSwitchLegend}
          options={DETAILS_VIEW_OPTIONS}
          idSelected={selectedView}
          onChange={onChangeView}
          buttonSize="compressed"
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);

export const CopyableValue: React.FC<{ value: string; ariaLabel: string; testSubj?: string }> = ({
  value,
  ariaLabel,
  testSubj,
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false} style={{ minWidth: 0, wordBreak: 'break-all' }}>
      {value}
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiCopy textToCopy={value}>
        {(copy) => (
          <EuiButtonIcon
            iconType="copy"
            color="text"
            aria-label={ariaLabel}
            size="xs"
            onClick={copy}
            data-test-subj={testSubj}
          />
        )}
      </EuiCopy>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// Lines that fit in DETAILS_CODE_MAX_HEIGHT. Below this the block needs no height cap.
const DETAILS_CODE_MAX_LINES = 15;
const DETAILS_CODE_MAX_HEIGHT = 300;

/**
 * Copyable code block for an asset's logic (rule detection, filter check). The height is
 * capped only when the code is long: `overflowHeight` adds a fullscreen button above the
 * copy button, and in a short block that stack spills out of the block.
 */
export const DetailsCodeBlock: React.FC<{ language: string; code: string; testSubj?: string }> = ({
  language,
  code,
  testSubj,
}) => (
  <EuiCodeBlock
    language={language}
    isCopyable
    overflowHeight={
      code.split('\n').length > DETAILS_CODE_MAX_LINES ? DETAILS_CODE_MAX_HEIGHT : undefined
    }
    data-test-subj={testSubj}
  >
    {code}
  </EuiCodeBlock>
);

/** Full-width description plus a compact key/value list; empty values are left out. */
export const DetailsOverview: React.FC<{
  description?: string;
  descriptionTestSubj?: string;
  items: Array<{ title: string; description?: React.ReactNode }>;
  testSubj?: string;
}> = ({ description, descriptionTestSubj, items, testSubj }) => {
  const listItems = items.filter(({ description: value }) => value) as Array<{
    title: string;
    description: NonNullable<React.ReactNode>;
  }>;
  return (
    <>
      {description && (
        <>
          <EuiText size="s" data-test-subj={descriptionTestSubj}>
            <p>{description}</p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {listItems.length > 0 && (
        <>
          <EuiDescriptionList
            type="column"
            compressed
            listItems={listItems}
            titleProps={{ style: { width: '30%' } }}
            descriptionProps={{ style: { width: '70%' } }}
            data-test-subj={testSubj}
          />
          <EuiSpacer size="l" />
        </>
      )}
    </>
  );
};

/** Collapsible section; `testSubj` lands on the accordion. */
export const DetailsSection: React.FC<{
  id: string;
  title: string;
  count?: number;
  initialIsOpen?: boolean;
  testSubj: string;
}> = ({ id, title, count, initialIsOpen = false, testSubj, children }) => (
  <>
    <EuiAccordion
      id={id}
      data-test-subj={testSubj}
      initialIsOpen={initialIsOpen}
      paddingSize="s"
      buttonContent={
        <EuiTitle size="xxs">
          <h3>{count === undefined ? title : `${title} (${count})`}</h3>
        </EuiTitle>
      }
    >
      {children}
    </EuiAccordion>
    <EuiSpacer size="m" />
  </>
);

/**
 * One link per line. Long URLs are truncated; the tooltip shows the full one and the
 * external icon stays on the same line.
 */
export const ReferenceLinks: React.FC<{ urls: string[]; testSubj?: string }> = ({
  urls,
  testSubj,
}) => (
  <EuiText size="s" data-test-subj={testSubj}>
    {urls.map((url, i) => (
      <EuiToolTip key={i} content={url} display="block">
        <EuiLink
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', maxWidth: '100%' }}
        >
          <span className="eui-textTruncate">{url}</span>
        </EuiLink>
      </EuiToolTip>
    ))}
  </EuiText>
);

/** Collapsed References section, hidden when there are none. */
export const ReferencesSection: React.FC<{
  idPrefix: string;
  urls?: string[];
  linksTestSubj?: string;
}> = ({ idPrefix, urls, linksTestSubj = `${idPrefix}_references` }) => {
  const references = (urls ?? []).filter(Boolean);
  if (!references.length) return null;
  return (
    <DetailsSection
      id={`${idPrefix}_section_references`}
      testSubj={`${idPrefix}_section_references`}
      title="References"
      count={references.length}
    >
      <ReferenceLinks urls={references} testSubj={linksTestSubj} />
    </DetailsSection>
  );
};
