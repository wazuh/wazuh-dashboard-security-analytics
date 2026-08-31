/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssetIdentity, formatAssetLabel } from './AssetIdentity';

const IDENTIFIER = 'decoder/core-wazuh-message/0';
const TITLE = 'Wazuh message decoder';

describe('formatAssetLabel', () => {
  it('pairs the name with the identifier', () => {
    expect(formatAssetLabel(TITLE, IDENTIFIER)).toBe(
      'Wazuh message decoder (decoder/core-wazuh-message/0)'
    );
  });

  it('falls back to the identifier alone when the asset has no title', () => {
    expect(formatAssetLabel(undefined, IDENTIFIER)).toBe(IDENTIFIER);
  });

  it('returns an empty string with nothing to show, so a caller can fall back', () => {
    expect(formatAssetLabel(undefined, undefined)).toBe('');
  });
});

describe('AssetIdentity', () => {
  it('shows the name and keeps the identifier underneath', () => {
    const { getByText } = render(<AssetIdentity title={TITLE} identifier={IDENTIFIER} />);

    expect(getByText(TITLE)).toBeInTheDocument();
    expect(getByText(IDENTIFIER)).toBeInTheDocument();
  });

  it('shows the identifier alone when the asset has no title', () => {
    const { getByText, queryByText } = render(<AssetIdentity identifier={IDENTIFIER} />);

    expect(getByText(IDENTIFIER)).toBeInTheDocument();
    expect(queryByText(TITLE)).toBeNull();
  });

  it('renders the empty value when there is no identifier', () => {
    // A policy with no root decoder reaches this, and a dash is what the panel shows for
    // every other unset value.
    const { getByText } = render(<AssetIdentity title={TITLE} />);

    expect(getByText('-')).toBeInTheDocument();
  });

  it('takes the empty value from the caller', () => {
    const { getByText } = render(<AssetIdentity emptyValue="Not defined" />);

    expect(getByText('Not defined')).toBeInTheDocument();
  });
});
