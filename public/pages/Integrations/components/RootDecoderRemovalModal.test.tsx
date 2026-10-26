/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { RootDecoderRemovalModal, hasNormalizationResources } from './RootDecoderRemovalModal';

const empty = { decoders: [], kvdbs: [], filters: [] };

describe('hasNormalizationResources', () => {
  it('is false when every group is empty or missing', () => {
    expect(hasNormalizationResources(undefined)).toBe(false);
    expect(hasNormalizationResources(empty)).toBe(false);
  });

  it('is true when any group has a resource', () => {
    expect(hasNormalizationResources({ ...empty, filters: [{ id: 'filter-1' }] })).toBe(true);
  });
});

describe('<RootDecoderRemovalModal />', () => {
  const callbacks = () => ({
    onClearNormalization: jest.fn(),
    onSaveAnyway: jest.fn(),
    onCancel: jest.fn(),
  });

  it('lists the non-empty groups and offers to clear them', () => {
    const props = callbacks();
    const { getByTestId, queryByTestId, getByText } = render(
      <RootDecoderRemovalModal
        resources={{ ...empty, kvdbs: [{ id: 'kvdb-1', name: 'Ports' }, { id: 'kvdb-2' }] }}
        isClearing={false}
        isSaving={false}
        {...props}
      />
    );

    expect(getByTestId('rootDecoderRemovalModal-KVDBs').textContent).toBe('KVDBs (2)Portskvdb-2');
    expect(queryByTestId('rootDecoderRemovalModal-Decoders')).toBeNull();

    fireEvent.click(getByText('Clear normalization', { selector: 'button *' }));
    expect(props.onClearNormalization).toHaveBeenCalled();
  });

  it('shows the error and does not offer to clear when the resources were not listed', () => {
    const props = callbacks();
    const { getByText, queryByTestId, getByTestId } = render(
      <RootDecoderRemovalModal error="Forbidden" isClearing={false} isSaving={false} {...props} />
    );

    expect(getByText('Forbidden')).toBeTruthy();
    expect(queryByTestId('rootDecoderRemovalModal-clearNormalization')).toBeNull();

    fireEvent.click(getByTestId('rootDecoderRemovalModal-saveAnyway'));
    expect(props.onSaveAnyway).toHaveBeenCalled();
  });
});
