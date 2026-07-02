/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PendingPromotionCallout } from './PendingPromotionCallout';

describe('<PendingPromotionCallout /> spec', () => {
  it('renders the pending promotion message with both space names', () => {
    const { getByText } = render(
      <PendingPromotionCallout
        space="draft"
        nextSpace="test"
        onPromote={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('You have changes pending promotion')).toBeTruthy();
    expect(getByText('draft')).toBeTruthy();
    expect(getByText('test')).toBeTruthy();
    expect(getByText('Promote changes')).toBeTruthy();
  });

  it('calls onPromote when the promote button is clicked', () => {
    const onPromote = jest.fn();
    const { getByText } = render(
      <PendingPromotionCallout
        space="draft"
        nextSpace="test"
        onPromote={onPromote}
        onDismiss={jest.fn()}
      />
    );

    fireEvent.click(getByText('Promote changes'));
    expect(onPromote).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <PendingPromotionCallout
        space="draft"
        nextSpace="test"
        onPromote={jest.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(getByLabelText('Close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
