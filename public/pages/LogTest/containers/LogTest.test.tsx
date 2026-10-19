/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { LogTest } from './LogTest';
import { createFakeHistory, setupCoreStart } from '../../../../test/utils/helpers';
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
      executeNormalization: jest.fn(),
      executeDetection: jest.fn(),
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

const buildHistory = (search = '') =>
  ({
    push: jest.fn(),
    replace: jest.fn(),
    listen: jest.fn(),
    location: { pathname: '/log_test', search },
  } as any);

const mountLogTest = async (history = buildHistory()) => {
  let wrapper: any;
  await act(async () => {
    wrapper = mount(<LogTest history={history} notifications={notifications} />);
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

const { DataStore } = jest.requireMock('../../../store/DataStore');

const RULE_ONLY_INTEGRATION = 'int-rules';
const DECODER_ONLY_INTEGRATION = 'int-decoders';

// Wazuh: the test space as the issue leaves it (rules, no root decoder); standard complete.
const policiesBySpace: Record<string, any> = {
  test: {
    document: { enabled: true, root_decoder: null },
    integrationsMap: {
      [RULE_ONLY_INTEGRATION]: {
        document: {
          id: RULE_ONLY_INTEGRATION,
          enabled: true,
          metadata: { title: 'ux-test-int' },
          rulesCount: 1,
        },
      },
    },
  },
  custom: { document: { enabled: true, root_decoder: null }, integrationsMap: {} },
  standard: {
    document: { enabled: true, root_decoder: 'root' },
    integrationsMap: {
      [DECODER_ONLY_INTEGRATION]: {
        document: {
          id: DECODER_ONLY_INTEGRATION,
          enabled: true,
          metadata: { title: 'ux-sshd-decoders' },
          rulesCount: 0,
        },
      },
      [RULE_ONLY_INTEGRATION]: {
        document: {
          id: RULE_ONLY_INTEGRATION,
          enabled: true,
          metadata: { title: 'ux-test-int' },
          rulesCount: 1,
        },
      },
    },
  },
};

const subj = (wrapper: any, id: string) => wrapper.find(`[data-test-subj="${id}"]`).hostNodes();
const checkedScope = (wrapper: any) =>
  wrapper
    .find('input[name="logTestScope"]')
    .hostNodes()
    .filterWhere((input: any) => input.prop('checked'))
    .prop('id');

const run = async (wrapper: any) => {
  await act(async () => {
    subj(wrapper, 'logTestRun').simulate('click');
  });
  wrapper.update();
};

describe('<LogTest /> scopes', () => {
  beforeEach(() => {
    DataStore.policies.searchPolicies.mockImplementation((space: string) =>
      Promise.resolve({ items: [policiesBySpace[space]], total: 1 })
    );
    DataStore.logTests.executeLogTest.mockReset();
    DataStore.logTests.executeNormalization.mockReset();
    DataStore.logTests.executeDetection.mockReset();
  });

  afterAll(() => {
    DataStore.policies.searchPolicies.mockResolvedValue({ items: [], total: 0 });
  });

  it('asks the policies for the rule count of every integration', async () => {
    await mountLogTest();

    expect(DataStore.policies.searchPolicies).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        includeIntegrationFields: expect.arrayContaining(['document.rules']),
      })
    );
  });

  it('opens on the combined test in a complete space', async () => {
    const wrapper = await mountLogTest();

    expect(checkedScope(wrapper)).toBe('logTestScope-full');
    expect(subj(wrapper, 'logTestScopeUnavailable').length).toBe(0);
  });

  it('opens on Detection only in a space promoted without a root decoder (#1694)', async () => {
    const wrapper = await mountLogTest(buildHistory('?space=test'));

    expect(checkedScope(wrapper)).toBe('logTestScope-detection');
  });

  it('explains a linked scope that cannot run, and switches with one click', async () => {
    const wrapper = await mountLogTest(buildHistory('?space=test&scope=full'));

    expect(checkedScope(wrapper)).toBe('logTestScope-full');
    expect(subj(wrapper, 'logTestScopeUnavailable').text()).toContain(
      'The test space has no root decoder'
    );
    expect(subj(wrapper, 'logTestRun').prop('disabled')).toBe(true);

    await act(async () => {
      subj(wrapper, 'logTestSwitchScope').simulate('click');
    });
    wrapper.update();

    expect(checkedScope(wrapper)).toBe('logTestScope-detection');
    expect(subj(wrapper, 'logTestScopeUnavailable').length).toBe(0);
  });

  it('opens a deep link on its space, scope and integration', async () => {
    const wrapper = await mountLogTest(
      buildHistory(`?space=test&scope=detection&integration=${RULE_ONLY_INTEGRATION}`)
    );

    expect(checkedScope(wrapper)).toBe('logTestScope-detection');
    expect(wrapper.find('IntegrationComboBox').prop('selectedId')).toBe(RULE_ONLY_INTEGRATION);
  });

  it('drops a linked integration that is not in the space', async () => {
    const wrapper = await mountLogTest(
      buildHistory(`?space=test&scope=detection&integration=${DECODER_ONLY_INTEGRATION}`)
    );

    expect(wrapper.find('IntegrationComboBox').prop('selectedId')).toBe('');
  });

  it('keeps the URL in step with the form', async () => {
    const history = buildHistory('?dataSourceId=');
    await mountLogTest(history);

    const search = new URLSearchParams(history.replace.mock.calls.slice(-1)[0][0].search);
    expect(search.get('space')).toBe('standard');
    expect(search.get('scope')).toBe('full');
    expect(search.get('dataSourceId')).toBe('');
  });

  it('follows a link to Log test opened while already on it', async () => {
    const history = createFakeHistory('/log-test', '?space=standard&scope=full');
    const wrapper = await mountLogTest(history as any);

    await act(async () => {
      history.replace({
        search: `?space=test&scope=detection&integration=${RULE_ONLY_INTEGRATION}`,
      });
    });
    wrapper.update();

    expect(checkedScope(wrapper)).toBe('logTestScope-detection');
    expect(wrapper.find('LogTestForm').prop('formData').space).toBe('test');
    expect(wrapper.find('IntegrationComboBox').prop('selectedId')).toBe(RULE_ONLY_INTEGRATION);
    // The page's own write that follows keeps what the link asked for.
    expect(new URLSearchParams(history.location.search).get('scope')).toBe('detection');
  });

  it('requires an integration in the combined test', async () => {
    const wrapper = await mountLogTest();
    act(() => {
      wrapper.find('LogTestForm').prop('onFormChange')('event', 'sshd log line');
    });
    wrapper.update();

    await run(wrapper);

    expect(wrapper.find('IntegrationComboBox').prop('error')).toBe('Integration is required');
    expect(DataStore.logTests.executeLogTest).not.toHaveBeenCalled();
  });

  it('runs Detection only against the normalized event', async () => {
    DataStore.logTests.executeDetection.mockResolvedValue({
      success: true,
      data: {
        status: '200',
        message: {
          detection: { status: 'success', rules_evaluated: 1, rules_matched: 0, matches: [] },
        },
      },
    });
    const wrapper = await mountLogTest(
      buildHistory(`?space=test&scope=detection&integration=${RULE_ONLY_INTEGRATION}`)
    );
    act(() => {
      wrapper.find('LogTestForm').prop('onFormChange')(
        'normalizedEvent',
        '{"process.name": "sshd"}'
      );
    });
    wrapper.update();

    await run(wrapper);

    expect(DataStore.logTests.executeDetection).toHaveBeenCalledWith({
      document: {
        space: 'test',
        integration: RULE_ONLY_INTEGRATION,
        input: { 'process.name': 'sshd' },
      },
    });
    expect(subj(wrapper, 'logTestResultScope').text()).toBe('Detection only · test space');
  });

  it('rejects a normalized event that is not a JSON object before calling the API', async () => {
    const wrapper = await mountLogTest(
      buildHistory(`?space=test&scope=detection&integration=${RULE_ONLY_INTEGRATION}`)
    );
    act(() => {
      wrapper.find('LogTestForm').prop('onFormChange')('normalizedEvent', '[]');
    });
    wrapper.update();

    await run(wrapper);

    expect(wrapper.find('NormalizedEventEditor').prop('error')).toBe(
      'The normalized event must be a JSON object, not an array.'
    );
    expect(DataStore.logTests.executeDetection).not.toHaveBeenCalled();
  });

  it('runs Normalization only without an integration, then hands the output to detection', async () => {
    const output = { process: { name: 'sshd' } };
    DataStore.logTests.executeNormalization.mockResolvedValue({
      success: true,
      data: { status: '200', message: { normalization: { output, asset_traces: [] } } },
    });
    const wrapper = await mountLogTest(buildHistory('?space=standard&scope=normalization'));
    act(() => {
      wrapper.find('LogTestForm').prop('onFormChange')('event', 'sshd log line');
    });
    wrapper.update();

    await run(wrapper);

    const [[request]] = DataStore.logTests.executeNormalization.mock.calls;
    expect(request.document).toEqual(
      expect.objectContaining({ event: 'sshd log line', space: 'standard', queue: 1 })
    );
    expect(request.document).not.toHaveProperty('integration');

    await act(async () => {
      subj(wrapper, 'logTestHandoffToDetection').simulate('click');
    });
    wrapper.update();

    expect(checkedScope(wrapper)).toBe('logTestScope-detection');
    expect(wrapper.find('LogTestForm').prop('formData').normalizedEvent).toBe(
      JSON.stringify(output, null, 2)
    );
    expect(wrapper.find('LogTestForm').prop('lastNormalizedOutput')).toEqual(output);
  });
});
