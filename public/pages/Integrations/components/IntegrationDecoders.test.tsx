/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationDecoders } from './IntegrationDecoders';
import { SpaceTypes } from '../../../../common/constants';

jest.mock('../../Decoders/hooks/useIntegrationDecoders', () => ({
  useIntegrationDecoders: () => ({
    items: [{ id: 'decoder-1', name: 'decoder/one/0', title: 'One', author: 'Wazuh' }],
    total: 1,
    loading: false,
    refresh: jest.fn(),
  }),
}));

const buildHistory = () => ({ push: jest.fn() } as any);

const mountTable = async (space: string, history: any) => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <IntegrationDecoders decoderIds={['decoder-1']} space={space} enabled history={history} />
    );
  });
  wrapper.update();
  return wrapper;
};

const getEditAction = (wrapper: any) => {
  const columns = wrapper.find('EuiBasicTable').first().prop('columns') as any[];
  const actionsColumn = columns.find((column) => column.name === 'Actions');
  return actionsColumn?.actions?.find((action: any) => action.name === 'Edit');
};

describe('<IntegrationDecoders /> edit action', () => {
  it('navigates to the decoder edit page in the draft space, keeping the space param', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, history);
    const editAction = getEditAction(wrapper);

    expect(editAction.available()).toBe(true);

    editAction.onClick({ id: 'decoder-1' });
    expect(history.push).toHaveBeenCalledWith(
      `/edit-decoder/decoder-1?space=${SpaceTypes.DRAFT.value}`
    );
  });

  it('is not available outside the draft space', async () => {
    const wrapper = await mountTable(SpaceTypes.STANDARD.value, buildHistory());

    expect(getEditAction(wrapper).available()).toBe(false);
  });
});
