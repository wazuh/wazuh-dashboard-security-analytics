/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ListEmptyPrompt } from './ListEmptyPrompt';
import { SpaceTypes } from '../../../common/constants';

describe('ListEmptyPrompt', () => {
  it('tells the user to clear the search when filters are applied', () => {
    const { getByText, queryByText } = render(
      <ListEmptyPrompt entity="decoders" hasFilters space={SpaceTypes.CUSTOM.value} />
    );

    getByText('No decoders match your search or filters');
    expect(queryByText(/shipped with Wazuh/)).toBeNull();
  });

  it('drops the word "filters" for lists that only offer free-text search', () => {
    const { getByText } = render(<ListEmptyPrompt entity="rules" hasFilters searchOnly />);

    getByText('No rules match your search');
    getByText('Clear it to see all rules.');
  });

  it('offers the Actions menu only in the space where content can be created', () => {
    const { getByText } = render(
      <ListEmptyPrompt entity="decoders" hasFilters={false} space={SpaceTypes.DRAFT.value} />
    );

    getByText('Create one from the Actions menu.');
  });

  it('points a promote-only space at the space its content comes from', () => {
    const { getByText, queryByText } = render(
      <ListEmptyPrompt entity="decoders" hasFilters={false} space={SpaceTypes.CUSTOM.value} />
    );

    getByText(`Promote decoders from the ${SpaceTypes.TEST.label} space.`);
    expect(queryByText(/Actions menu/)).toBeNull();
  });

  it('offers the Standard space when the current space has no content', () => {
    const onGoToStandard = jest.fn();
    const { getByRole, getByText } = render(
      <ListEmptyPrompt
        entity="decoders"
        hasFilters={false}
        space={SpaceTypes.CUSTOM.value}
        onGoToStandard={onGoToStandard}
      />
    );

    getByText('No decoders in this space');
    fireEvent.click(
      getByRole('button', { name: `${SpaceTypes.STANDARD.label.toLowerCase()} space` })
    );
    expect(onGoToStandard).toHaveBeenCalledTimes(1);
  });

  it('hides the Standard hint while already in Standard', () => {
    const { queryByText } = render(
      <ListEmptyPrompt
        entity="decoders"
        hasFilters={false}
        space={SpaceTypes.STANDARD.value}
        onGoToStandard={jest.fn()}
      />
    );

    expect(queryByText(/shipped with Wazuh/)).toBeNull();
  });

  it('renders no body when the caller passes null', () => {
    const { queryByText } = render(
      <ListEmptyPrompt
        entity="KVDBs"
        hasFilters={false}
        noContentTitle="This integration has no KVDBs"
        emptyBody={null}
      />
    );

    queryByText('This integration has no KVDBs');
    expect(queryByText(/Actions menu/)).toBeNull();
  });
});
