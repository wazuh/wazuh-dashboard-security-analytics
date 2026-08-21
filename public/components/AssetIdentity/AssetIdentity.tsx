/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

/**
 * A catalog asset carries two names. For a decoder, `document.name` holds the machine
 * identifier (`decoder/core-wazuh-message/0`) and `document.metadata.title` holds the
 * human name (`Wazuh message decoder`). Screens that printed the identifier alone left
 * the reader decoding an address. Dropping it is worse: the engine errors, the promote
 * flow and the policy all refer to an asset by that identifier.
 *
 * Show both, name first. Use `formatAssetLabel` where only a string fits, such as a
 * combo box option, and `AssetIdentity` where two lines fit.
 */

const truncateStyle: React.CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Single-line pairing, for a select or combo box option. */
export const formatAssetLabel = (title?: string, identifier?: string): string => {
  if (!identifier) return title ?? '';
  if (!title) return identifier;
  return `${title} (${identifier})`;
};

export interface AssetIdentityProps {
  title?: string;
  identifier?: string;
  /** Rendered when there is no identifier at all. */
  emptyValue?: React.ReactNode;
}

/** Two-line pairing: the name, then the identifier underneath. */
export const AssetIdentity: React.FC<AssetIdentityProps> = ({
  title,
  identifier,
  emptyValue = '-',
}) => {
  if (!identifier) {
    return <>{emptyValue}</>;
  }

  if (!title) {
    return (
      <span title={identifier} style={truncateStyle}>
        {identifier}
      </span>
    );
  }

  return (
    <>
      <span title={title} style={truncateStyle}>
        {title}
      </span>
      <EuiText size="xs" color="subdued">
        <span title={identifier} style={truncateStyle}>
          {identifier}
        </span>
      </EuiText>
    </>
  );
};
