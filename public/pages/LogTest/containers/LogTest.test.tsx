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
  it('renders a link to the Log test documentation, separate from the "How it works" icon', async () => {
    const wrapper = await mountLogTest();

    const docLink = wrapper.find('[data-test-subj="logTestDocumentationLink"]').hostNodes();
    expect(docLink.length).toBe(1);
    expect(docLink.prop('href')).toBe(LOG_TEST_DOCUMENTATION_URL);
    expect(docLink.prop('target')).toBe('_blank');

    // Wazuh: locks in that this is additive — the shared "How it works" trigger
    // rendered by SpaceSelector must still be there, unchanged.
    expect(wrapper.find('EuiButtonIcon[iconType="iInCircle"]').length).toBe(2);
  });
});
