/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { IntegrationDecoders } from './IntegrationDecoders';
import { SpaceTypes } from '../../../../common/constants';

let mockDecoders = [{ id: 'decoder-1', name: 'decoder/one/0', title: 'One', author: 'Wazuh' }];

jest.mock('../../Decoders/hooks/useIntegrationDecoders', () => ({
  useIntegrationDecoders: () => ({
    items: mockDecoders,
    total: mockDecoders.length,
    loading: false,
    refresh: jest.fn(),
  }),
}));

const buildHistory = () => ({ push: jest.fn() } as any);

// Wazuh: the Integration details view hands the table its own path, on its own tab.
const RETURN_TO = '/integrations/wazuh-core?space=draft&tab=decoders';

// The cross-app link to the create form, carrying this integration.
const CREATE_HREF = 'decoders#/create-decoder?integration=Wazuh%20core';

const mountTable = async (space: string, history: any) => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <IntegrationDecoders
        decoderIds={['decoder-1']}
        space={space}
        enabled
        history={history}
        returnTo={RETURN_TO}
        createHref={CREATE_HREF}
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const getEditButton = (wrapper: any) =>
  wrapper.find(`button[data-test-subj="integration-decoders-edit"]`).first();

const getEditTooltip = (wrapper: any) =>
  wrapper.find('IntegrationEditAction').first().find('EuiToolTip').first().prop('content');

describe('<IntegrationDecoders /> edit action', () => {
  it('navigates to the decoder edit page in the draft space', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, history);
    const editButton = getEditButton(wrapper);

    expect(editButton.prop('disabled')).toBe(false);
    expect(getEditTooltip(wrapper)).toBe('Edit decoder');

    editButton.simulate('click');
    expect(history.push).toHaveBeenCalledWith(
      `/edit-decoder/decoder-1?space=${SpaceTypes.DRAFT.value}&returnTo=${encodeURIComponent(
        RETURN_TO
      )}`
    );
  });

  it('stays visible but disabled outside the draft space, saying where editing is allowed', async () => {
    const history = buildHistory();
    const wrapper = await mountTable(SpaceTypes.STANDARD.value, history);

    expect(getEditButton(wrapper).prop('disabled')).toBe(true);
    expect(getEditTooltip(wrapper)).toBe('Decoders can only be edited in the spaces: draft');

    expect(history.push).not.toHaveBeenCalled();
  });
});

describe('<IntegrationDecoders /> empty state', () => {
  afterEach(() => {
    mockDecoders = [{ id: 'decoder-1', name: 'decoder/one/0', title: 'One', author: 'Wazuh' }];
  });

  it('offers a create link that carries the integration to the create form', async () => {
    mockDecoders = [];
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());

    const createButton = wrapper
      .find('EuiButton')
      .filterWhere((button: any) => button.text().startsWith('Create decoder'))
      .first();

    expect(createButton.prop('href')).toBe(CREATE_HREF);
  });
});
