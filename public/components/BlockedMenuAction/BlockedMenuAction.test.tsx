/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { BlockedMenuAction } from './BlockedMenuAction';

describe('BlockedMenuAction', () => {
  const reason = 'Edit it in the draft space and promote the change.';

  it('shows the label and uses the reason as the tooltip', () => {
    const wrapper = mount(<BlockedMenuAction iconType="pencil" label="Edit" reason={reason} />);

    expect(wrapper.text()).toContain('Edit');
    expect(wrapper.find('EuiToolTip').prop('content')).toBe(reason);
  });

  it('is marked as disabled for assistive technology', () => {
    const wrapper = mount(<BlockedMenuAction iconType="trash" label="Delete" reason={reason} />);

    expect(wrapper.find('[aria-disabled="true"]').hostNodes().length).toBeGreaterThan(0);
  });
});
