/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { LogTestScopeSelector } from './LogTestScopeSelector';
import { LogTestScopeAvailability } from '../utils';

const ALL_AVAILABLE: LogTestScopeAvailability = {
  full: undefined,
  normalization: undefined,
  detection: undefined,
};

const NO_ROOT_DECODER: LogTestScopeAvailability = {
  full: 'no-root-decoder',
  normalization: 'no-root-decoder',
  detection: undefined,
};

const radio = (wrapper: any, scope: string) =>
  wrapper.find(`input#logTestScope-${scope}`).hostNodes();

describe('<LogTestScopeSelector />', () => {
  it('renders one card per scope, with its description', () => {
    const wrapper = mount(
      <LogTestScopeSelector
        scope="full"
        availability={ALL_AVAILABLE}
        space="test"
        onChange={jest.fn()}
      />
    );

    const text = wrapper.text();
    expect(text).toContain('Normalization and detection');
    expect(text).toContain('Normalization only');
    expect(text).toContain('Detection only');
    expect(text).toContain('Works without decoders.');
    expect(radio(wrapper, 'full').prop('checked')).toBe(true);
  });

  it('reports the picked scope', () => {
    const onChange = jest.fn();
    const wrapper = mount(
      <LogTestScopeSelector
        scope="full"
        availability={ALL_AVAILABLE}
        space="test"
        onChange={onChange}
      />
    );

    radio(wrapper, 'detection').simulate('change');

    expect(onChange).toHaveBeenCalledWith('detection');
  });

  it('disables the scopes a space without a root decoder cannot run, and says why', () => {
    const wrapper = mount(
      <LogTestScopeSelector
        scope="detection"
        availability={NO_ROOT_DECODER}
        space="test"
        onChange={jest.fn()}
      />
    );

    expect(radio(wrapper, 'full').prop('disabled')).toBe(true);
    expect(radio(wrapper, 'normalization').prop('disabled')).toBe(true);
    expect(radio(wrapper, 'detection').prop('disabled')).toBe(false);
    expect(wrapper.find('EuiBadge').map((badge: any) => badge.text())).toEqual([
      'Needs a root decoder',
      'Needs a root decoder',
    ]);
    const cardTooltips = wrapper
      .find('EuiToolTip')
      .filterWhere((tip: any) => tip.prop('anchorClassName') === 'eui-fullHeight');
    expect(cardTooltips.length).toBe(2);
    expect(cardTooltips.first().prop('content')).toBe(
      'Not available in the test space, because its policy has no root decoder. Select one in the draft space and promote it.'
    );
  });

  it('keeps the selected scope enabled even when it cannot run, so the choice stays visible', () => {
    const wrapper = mount(
      <LogTestScopeSelector
        scope="full"
        availability={NO_ROOT_DECODER}
        space="test"
        onChange={jest.fn()}
      />
    );

    expect(radio(wrapper, 'full').prop('disabled')).toBe(false);
    expect(radio(wrapper, 'full').prop('checked')).toBe(true);
    expect(radio(wrapper, 'normalization').prop('disabled')).toBe(true);
  });
});
