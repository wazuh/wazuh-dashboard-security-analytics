/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { PageHeader, PageHeaderProps } from '../PageHeader/PageHeader';

export interface WazuhPageHeaderProps
  extends Pick<
    PageHeaderProps,
    'appBadgeControls' | 'appRightControls' | 'appDescriptionControls'
  > {
  /** Page title. Accepts a node, so a title can carry a badge beside it. */
  title: React.ReactNode;
  /** Optional. Omit it and no description row is rendered at all. */
  description?: React.ReactNode;
  /** Space selector, action menus. Rendered right of the title, in order. */
  controls?: React.ReactNode[];
}

/** Controls are single-line, so they center against the title, not against its top. */
const CONTROL_STYLE: React.CSSProperties = { alignSelf: 'center' };

/**
 * A full-width line of prose is hard to read on a wide screen, so the description is
 * capped near the comfortable measure for continuous text rather than filling the row.
 */
const DESCRIPTION_STYLE: React.CSSProperties = { maxWidth: '90ch' };

/**
 * The page header every security analytics list page shares: one row for the title and
 * its controls, one row for the description.
 *
 * Sharing a row made the description inherit whatever width the controls left over, so
 * the longest ones wrapped while the space beside them stayed empty. Every page also
 * repeated the block by hand and had drifted apart on alignment and spacing.
 *
 * This wraps the upstream `PageHeader` rather than changing it: the updated-UX branch
 * still hands the title and description to the platform's own header, and only the
 * legacy branch is laid out here.
 */
export const WazuhPageHeader: React.FC<WazuhPageHeaderProps> = ({
  title,
  description,
  controls,
  ...pageHeaderProps
}) => (
  <PageHeader {...pageHeaderProps}>
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            <h1>{title}</h1>
          </EuiText>
        </EuiFlexItem>
        {controls?.map((control, index) => (
          <EuiFlexItem grow={false} key={index} style={CONTROL_STYLE}>
            {control}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued" style={DESCRIPTION_STYLE}>
            <p>{description}</p>
          </EuiText>
        </>
      )}
    </EuiFlexItem>
  </PageHeader>
);
