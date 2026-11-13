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

const mockUseIntegrationDecoders = jest.fn((_params: unknown) => ({
  items: mockDecoders,
  total: mockDecoders.length,
  loading: false,
}));

jest.mock('../../Decoders/hooks/useIntegrationDecoders', () => ({
  useIntegrationDecoders: (params: unknown) => mockUseIntegrationDecoders(params),
}));

const mockUseEntityStatusCounts = jest.fn((..._args: unknown[]) => ({
  counts: { enabled: 1, disabled: 2 },
  loading: false,
  reload: jest.fn(),
}));

jest.mock('../../../hooks/useEntityStatusCounts', () => ({
  useEntityStatusCounts: (...args: unknown[]) => mockUseEntityStatusCounts(...args),
}));

jest.mock('../../Decoders/hooks/useIntegrationDecoderGraph', () => ({
  ...jest.requireActual('../../Decoders/hooks/useIntegrationDecoderGraph'),
  useIntegrationDecoderGraph: () => ({
    graph: undefined,
    loading: false,
    error: undefined,
    truncated: false,
    hierarchyTruncated: false,
  }),
}));

jest.mock('./DecoderGraph', () => ({ DecoderGraph: () => null }));

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
        reloadTrigger={0}
        onRefresh={jest.fn()}
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

describe('<IntegrationDecoders /> status summary', () => {
  it('shows the total and the status split of every decoder of the integration', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const summary = wrapper.find(`[data-test-subj="integrationDecodersStatusSummary"]`).first();

    expect(summary.text()).toContain('1 result');
    expect(summary.text()).toContain('1 enabled');
    expect(summary.text()).toContain('2 disabled');
  });

  it('filters the table by the clicked status, and clears it on a second click', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    const clickDisabled = async () => {
      await act(async () => {
        wrapper
          .find(`button[data-test-subj="integrationDecodersStatusSummary-legend-disabled"]`)
          .first()
          .simulate('click');
      });
      wrapper.update();
    };

    await clickDisabled();
    expect(mockUseIntegrationDecoders).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'disabled' })
    );

    await clickDisabled();
    expect(mockUseIntegrationDecoders).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined })
    );
  });
});

describe('<IntegrationDecoders /> status summary scope and errors', () => {
  it('skips the counts in the cascade view, which hides the summary', async () => {
    const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());
    await act(async () => {
      wrapper.find('EuiButtonGroup').first().prop('onChange')('graph');
    });
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="integrationDecodersStatusSummary"]`).exists()).toBe(
      false
    );
    expect(mockUseEntityStatusCounts).toHaveBeenLastCalledWith(
      'decoders',
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });

  it('counts every item of the integration in its space', async () => {
    await mountTable(SpaceTypes.DRAFT.value, buildHistory());

    expect(mockUseEntityStatusCounts).toHaveBeenLastCalledWith(
      'decoders',
      { space: SpaceTypes.DRAFT.value, ids: ['decoder-1'] },
      expect.objectContaining({ enabled: true, reloadTrigger: 0 })
    );
  });

  it('shows no total when the list request failed', async () => {
    const listResult = mockUseIntegrationDecoders.getMockImplementation()!({});
    mockUseIntegrationDecoders.mockImplementation(
      () => ({ ...listResult, total: 0, error: true } as any)
    );
    try {
      const wrapper = await mountTable(SpaceTypes.DRAFT.value, buildHistory());

      expect(
        wrapper.find(`[data-test-subj="integrationDecodersStatusSummary-total"]`).exists()
      ).toBe(false);
    } finally {
      mockUseIntegrationDecoders.mockImplementation(() => listResult);
    }
  });
});
