/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from '@testing-library/react';
import { ParentsComboBox } from './ParentsComboBox';

jest.mock('../../../../../store/DataStore', () => ({
  DataStore: { decoders: { searchDecoders: jest.fn() } },
}));

const { DataStore } = jest.requireMock('../../../../../store/DataStore');

const decoder = (name: string, title?: string) => ({
  document: { name, metadata: title ? { title } : {} },
});

const render = (props: Partial<React.ComponentProps<typeof ParentsComboBox>> = {}) =>
  mount(
    <ParentsComboBox
      label="Parents"
      values={[]}
      onChange={jest.fn()}
      space="draft"
      ownName="decoder/apache-error/0"
      {...props}
    />
  );

const comboBox = (wrapper: ReactWrapper) => wrapper.find('EuiCompressedComboBox').first();

/** Focus the box and let the debounced search resolve. */
const focusAndSearch = async (wrapper: ReactWrapper) => {
  await act(async () => {
    (comboBox(wrapper).prop('onFocus') as () => void)();
  });
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  wrapper.update();
};

beforeEach(() => {
  jest.useFakeTimers();
  DataStore.decoders.searchDecoders.mockReset().mockResolvedValue({
    total: 2,
    items: [
      decoder('decoder/core-wazuh-message/0', 'Wazuh message decoder'),
      decoder('decoder/apache-error/0', 'Apache HTTP Server error logs decoder'),
    ],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ParentsComboBox', () => {
  it('does not search until the box is focused', () => {
    render();
    jest.runOnlyPendingTimers();
    expect(DataStore.decoders.searchDecoders).not.toHaveBeenCalled();
  });

  it('searches the decoders of the space quietly once focused', async () => {
    const wrapper = render();
    await focusAndSearch(wrapper);

    expect(DataStore.decoders.searchDecoders).toHaveBeenCalledTimes(1);
    const [body, space, options] = DataStore.decoders.searchDecoders.mock.calls[0];
    expect(space).toBe('draft');
    expect(options).toEqual({ silent: true });
    expect(body._source.includes).toEqual(['document.name', 'document.metadata.title']);
  });

  it('offers decoder names, leaving out the decoder being edited', async () => {
    const wrapper = render();
    await focusAndSearch(wrapper);

    const options = comboBox(wrapper).prop('options') as Array<{ label: string }>;
    expect(options.map((option) => option.label)).toEqual(['decoder/core-wazuh-message/0']);
  });

  it('lists the name first and the title after it', async () => {
    const wrapper = render();
    await focusAndSearch(wrapper);

    const renderOption = comboBox(wrapper).prop('renderOption') as (
      option: object
    ) => React.ReactElement;
    const option = mount(
      renderOption({ label: 'decoder/core-wazuh-message/0', title: 'Wazuh message decoder' })
    );
    expect(option.text()).toBe('decoder/core-wazuh-message/0 Wazuh message decoder');
    expect(option.find('EuiTextColor').prop('color')).toBe('subdued');
  });

  it('stores the names of the picked decoders', async () => {
    const onChange = jest.fn();
    const wrapper = render({ onChange });

    act(() => {
      (comboBox(wrapper).prop('onChange') as (options: Array<{ label: string }>) => void)([
        { label: 'decoder/core-wazuh-message/0' },
      ]);
    });
    expect(onChange).toHaveBeenCalledWith(['decoder/core-wazuh-message/0']);
  });

  it('shows the current parents as selected', () => {
    const wrapper = render({ values: ['decoder/core-wazuh-message/0'] });
    expect(comboBox(wrapper).prop('selectedOptions')).toEqual([
      { label: 'decoder/core-wazuh-message/0' },
    ]);
  });

  it('keeps a typed name the search did not return', () => {
    const onChange = jest.fn();
    const wrapper = render({ values: ['decoder/a/0'], onChange });

    act(() => {
      (comboBox(wrapper).prop('onCreateOption') as (value: string) => void)(' decoder/b/0 ');
    });
    expect(onChange).toHaveBeenCalledWith(['decoder/a/0', 'decoder/b/0']);
  });

  it('ignores a typed name that is empty or already a parent', () => {
    const onChange = jest.fn();
    const wrapper = render({ values: ['decoder/a/0'], onChange });
    const create = comboBox(wrapper).prop('onCreateOption') as (value: string) => void;

    act(() => {
      create('   ');
      create('decoder/a/0');
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers nothing when the search fails', async () => {
    DataStore.decoders.searchDecoders.mockResolvedValue({ total: 0, items: [], error: 'boom' });
    const wrapper = render();
    await focusAndSearch(wrapper);

    expect(comboBox(wrapper).prop('options')).toEqual([]);
    expect(comboBox(wrapper).prop('isLoading')).toBe(false);
  });
});
