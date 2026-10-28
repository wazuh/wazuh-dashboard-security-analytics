/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { IntegrationComboBox } from './IntegrationComboBox';

const OPTIONS = [{ id: 'integration-1', value: 'wazuh-core', label: 'wazuh-core' }];

const notifications: any = {
  toasts: { addDanger: jest.fn(), addSuccess: jest.fn(), addWarning: jest.fn() },
};

// The combo box reports a blur from a native focusout on its container.
const blur = (wrapper: ReactWrapper) => {
  act(() => {
    wrapper
      .find('input')
      .first()
      .getDOMNode()
      .dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
};

describe('<IntegrationComboBox />', () => {
  it.each([
    ['without', undefined],
    ['with', notifications],
  ])(
    'calls onBlur when the field loses focus %s the create button',
    (_label, withNotifications) => {
      const onBlur = jest.fn();
      const wrapper = mount(
        <IntegrationComboBox
          options={OPTIONS}
          selectedId=""
          isLoading={false}
          onChange={jest.fn()}
          onBlur={onBlur}
          notifications={withNotifications}
        />
      );

      blur(wrapper);

      expect(onBlur).toHaveBeenCalledTimes(1);
    }
  );
});
