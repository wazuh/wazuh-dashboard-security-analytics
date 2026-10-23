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
import { DataStore } from '../../../store/DataStore';

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

describe('<LogTest /> space without a root decoder', () => {
  const policyFor = (rootDecoder: string) => ({
    items: [
      {
        document: { enabled: true, root_decoder: rootDecoder },
        integrationsMap: {
          i1: { document: { id: 'i1', enabled: true, metadata: { title: 'rules-only' } } },
        },
      },
    ],
    total: 1,
  });

  beforeEach(() => {
    (DataStore.policies.searchPolicies as jest.Mock).mockImplementation((space: string) =>
      Promise.resolve(policyFor(space === 'standard' ? 'root-id' : ''))
    );
    (DataStore.logTests.executeLogTest as jest.Mock).mockReset();
    (DataStore.logTests.executeLogTest as jest.Mock).mockResolvedValue({ success: false });
  });

  afterAll(() => {
    (DataStore.policies.searchPolicies as jest.Mock).mockResolvedValue({ items: [], total: 0 });
  });

  const selectSpace = async (wrapper: any, space: string) => {
    await act(async () => {
      wrapper.find('SpaceSelector').prop('onSpaceChange')(space);
    });
    wrapper.update();
  };

  const fill = async (wrapper: any, field: string, value: string) => {
    await act(async () => {
      wrapper.find('LogTestForm').prop('onFormChange')(field, value);
    });
    wrapper.update();
  };

  const clickTest = async (wrapper: any) => {
    await act(async () => {
      wrapper.find('EuiButton[iconType="play"]').find('button').simulate('click');
    });
    wrapper.update();
  };

  const callout = (wrapper: any) =>
    wrapper.find('[data-test-subj="logTestNoRootDecoderCallout"]').hostNodes();

  it('explains the fallback and requires an integration', async () => {
    const wrapper = await mountLogTest();
    expect(callout(wrapper).length).toBe(0);

    await selectSpace(wrapper, 'test');

    expect(callout(wrapper).text()).toContain('The test space has no root decoder');
    expect(callout(wrapper).text()).toContain('parses the log with the standard space');
    expect(wrapper.find('LogTestForm').prop('integrationRequired')).toBe(true);

    await fill(wrapper, 'event', 'sample event');
    await clickTest(wrapper);

    expect(DataStore.logTests.executeLogTest).not.toHaveBeenCalled();
    expect(wrapper.find('LogTestForm').prop('errors')).toEqual({
      integration: 'Select an integration to run its rules.',
    });
  });

  it('asks the server to normalize with the standard space', async () => {
    const wrapper = await mountLogTest();
    await selectSpace(wrapper, 'test');
    await fill(wrapper, 'event', 'sample event');
    await fill(wrapper, 'integration', 'i1');
    await clickTest(wrapper);

    expect(DataStore.logTests.executeLogTest).toHaveBeenCalledWith({
      document: expect.objectContaining({
        space: 'test',
        integration: 'i1',
        normalization_space: 'standard',
      }),
    });
  });

  it('leaves a space with a root decoder unchanged', async () => {
    const wrapper = await mountLogTest();
    await fill(wrapper, 'event', 'sample event');
    await clickTest(wrapper);

    expect(callout(wrapper).length).toBe(0);
    expect(DataStore.logTests.executeLogTest).toHaveBeenCalledWith({
      document: expect.objectContaining({ space: 'standard', normalization_space: undefined }),
    });
  });
});
