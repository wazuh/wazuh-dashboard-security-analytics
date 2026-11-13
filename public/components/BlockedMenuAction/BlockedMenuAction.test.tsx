/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiContextMenuItem } from '@elastic/eui';
import { BlockedMenuAction } from './BlockedMenuAction';

describe('BlockedMenuAction', () => {
  const reason = 'Edit it in the draft space and promote the change.';

  it('shows the label and uses the reason as the tooltip', () => {
    const wrapper = mount(<BlockedMenuAction iconType="pencil" label="Edit" reason={reason} />);

    expect(wrapper.text()).toContain('Edit');
    expect(wrapper.find('EuiToolTip').prop('content')).toBe(reason);
  });

  const mountInMenuItem = (props: { iconType: 'trash' | 'pencil'; label: string }) =>
    mount(
      <EuiContextMenuItem>
        <BlockedMenuAction {...props} reason={reason} />
      </EuiContextMenuItem>,
      { attachTo: document.body.appendChild(document.createElement('div')) }
    );

  it('marks the focusable menu item as disabled for assistive technology', () => {
    const wrapper = mountInMenuItem({ iconType: 'trash', label: 'Delete' });

    expect(wrapper.find('button').getDOMNode().getAttribute('aria-disabled')).toBe('true');
    wrapper.unmount();
  });

  it('shows the tooltip while the menu item has keyboard focus', () => {
    const wrapper = mountInMenuItem({ iconType: 'pencil', label: 'Edit' });
    const button = wrapper.find('button').getDOMNode() as HTMLButtonElement;

    jest.useFakeTimers();
    act(() => {
      button.dispatchEvent(new FocusEvent('focus'));
      jest.runAllTimers();
    });
    expect(document.body.textContent).toContain(reason);

    jest.useRealTimers();
    wrapper.unmount();
  });
});
