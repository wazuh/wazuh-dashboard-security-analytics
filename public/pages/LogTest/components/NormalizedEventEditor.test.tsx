/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { NormalizedEventEditor } from './NormalizedEventEditor';

const USE_LAST = '[data-test-subj="logTestUseLastNormalizedOutput"]';

describe('<NormalizedEventEditor />', () => {
  it('edits the event as JSON and says how values are matched', () => {
    const wrapper = mount(<NormalizedEventEditor value="{}" onChange={jest.fn()} />);

    expect(wrapper.find('EuiCodeEditor').prop('mode')).toBe('json');
    expect(wrapper.text()).toContain('Normalized event');
    expect(wrapper.text()).toContain('Values are matched case-sensitively');
  });

  it('offers the last normalized output only when there is one', () => {
    const without = mount(<NormalizedEventEditor value="" onChange={jest.fn()} />);
    expect(without.find(USE_LAST).hostNodes().length).toBe(0);

    const onChange = jest.fn();
    const withOutput = mount(
      <NormalizedEventEditor
        value=""
        onChange={onChange}
        lastNormalizedOutput={{ event: { outcome: 'failure' } }}
      />
    );
    withOutput.find(USE_LAST).hostNodes().simulate('click');

    expect(onChange).toHaveBeenCalledWith(
      JSON.stringify({ event: { outcome: 'failure' } }, null, 2)
    );
  });

  it('shows the parse error in place of the help text', () => {
    const wrapper = mount(
      <NormalizedEventEditor
        value="[]"
        onChange={jest.fn()}
        error="The normalized event must be a JSON object, not an array."
      />
    );

    expect(wrapper.find('EuiFormRow').prop('isInvalid')).toBe(true);
    expect(wrapper.text()).toContain('must be a JSON object, not an array.');
  });
});
