/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import {
  DISABLED_INTEGRATION_MEANING,
  IntegrationStatus,
  getDisabledIntegrationExplanation,
} from './IntegrationStatus';
import { SpaceTypes } from '../../../../common/constants';
import { IntegrationMode } from '../utils/constants';

describe('getDisabledIntegrationExplanation', () => {
  it.each([SpaceTypes.DRAFT.value, SpaceTypes.STANDARD.value])(
    'points at the Actions menu in the %s space, where integrations can be enabled',
    (space) => {
      const text = getDisabledIntegrationExplanation(space, IntegrationMode.UserManaged);

      expect(text.startsWith(DISABLED_INTEGRATION_MEANING)).toBe(true);
      expect(text).toContain("select Enable in the integration's Actions menu");
    }
  );

  it.each([SpaceTypes.TEST.value, SpaceTypes.CUSTOM.value])(
    'points the %s space, which only receives promoted content, back at draft',
    (space) => {
      const text = getDisabledIntegrationExplanation(space, IntegrationMode.UserManaged);

      expect(text).toContain(
        `Enable it in the ${SpaceTypes.DRAFT.label.toLowerCase()} space and promote it.`
      );
      expect(text).not.toContain('Actions menu');
    }
  );

  it('says a protected integration cannot be enabled from the dashboard', () => {
    const text = getDisabledIntegrationExplanation(
      SpaceTypes.STANDARD.value,
      IntegrationMode.Protected
    );

    expect(text).toContain('protected');
    expect(text).not.toContain('Actions menu');
  });
});

describe('<IntegrationStatus />', () => {
  it('shows Enabled with no help icon', () => {
    const wrapper = mount(
      <IntegrationStatus
        enabled
        space={SpaceTypes.STANDARD.value}
        data-test-subj="integration_status"
      />
    );

    expect(wrapper.text()).toContain('Enabled');
    expect(wrapper.find('EuiIconTip').exists()).toBe(false);
  });

  it('shows Disabled with a help icon that explains it', () => {
    const wrapper = mount(
      <IntegrationStatus
        enabled={false}
        space={SpaceTypes.TEST.value}
        mode={IntegrationMode.UserManaged}
        data-test-subj="integration_status"
      />
    );
    const iconTip = wrapper.find('EuiIconTip');

    expect(wrapper.text()).toContain('Disabled');
    expect(iconTip.prop('aria-label')).toBe('What disabled means');
    expect(iconTip.prop('content')).toBe(
      getDisabledIntegrationExplanation(SpaceTypes.TEST.value, IntegrationMode.UserManaged)
    );
  });
});
