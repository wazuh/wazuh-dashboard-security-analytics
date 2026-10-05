/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { LogTest } from './LogTest';
import { setupCoreStart } from '../../../../test/utils/helpers';
import { LOG_TEST_DOCUMENTATION_URL } from '../../../utils/constants';

beforeAll(() => {
  setupCoreStart();
});

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    policies: {
      searchPolicies: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    },
    logTests: {
      executeLogTest: jest.fn(),
    },
  },
}));

const notifications: any = {
  toasts: {
    addDanger: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
  },
};

const buildHistory = () =>
  ({
    push: jest.fn(),
    replace: jest.fn(),
    listen: jest.fn(),
    location: { pathname: '/log_test', search: '' },
  } as any);

const mountLogTest = async () => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(<LogTest history={buildHistory() as any} notifications={notifications} />);
  });
  wrapper.update();
  return wrapper;
};

describe('<LogTest /> documentation link', () => {
  it('renders a "View documentation" link right after the page description, not as a header icon', async () => {
    const wrapper = await mountLogTest();

    const docLink = wrapper.find('[data-test-subj="logTestDocumentationLink"]').hostNodes();
    expect(docLink.length).toBe(1);
    expect(docLink.prop('href')).toBe(LOG_TEST_DOCUMENTATION_URL);
    expect(docLink.prop('target')).toBe('_blank');
    // Wazuh: EuiLink appends the external-link icon and its screen reader text
    // to a `target="_blank"` link, so the label is checked as a substring.
    expect(docLink.text()).toContain('View documentation');

    // Wazuh: the link sits in the same paragraph as (right after) the
    // description text, not off in the header controls.
    const descriptionParagraph = wrapper
      .find('p')
      .filterWhere((p) => p.text().includes('View documentation'));
    expect(descriptionParagraph.first().text()).toContain(
      'Log test runs a sample event through the content loaded in a space'
    );

    // Wazuh: locks in that the header controls reverted to just the space
    // selector — the shared "How it works" trigger is the only "i" icon left.
    expect(wrapper.find('EuiButtonIcon[iconType="iInCircle"]').length).toBe(1);
  });
});
