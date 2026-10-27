/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { KVDBFormPage } from './KVDBFormPage';
import { setupCoreStart } from '../../../../test/utils/helpers';

beforeAll(() => {
  setupCoreStart();
  // The global useContext mock (test/setup.jest.ts) hides Formik's context from the content editor.
  jest.spyOn(React, 'useContext').mockImplementation(jest.requireActual('react').useContext);
});

const EXISTING_KVDB_YAML = [
  'metadata:',
  '  title: ip-reputation',
  '  author: Wazuh',
  'enabled: true',
  'content:',
  '  10.0.0.1: malicious',
].join('\n');

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    kvdbs: {
      getKVDB: jest.fn(),
      createKVDB: jest.fn().mockResolvedValue({ message: 'created' }),
      updateKVDB: jest.fn().mockResolvedValue({ message: 'updated' }),
    },
    integrations: {
      listIntegrationOptions: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const notifications: any = {
  toasts: { addDanger: jest.fn(), addSuccess: jest.fn(), addWarning: jest.fn() },
};

const history: any = { push: jest.fn(), replace: jest.fn(), location: { search: '' } };

const renderEditPage = async (): Promise<ReactWrapper> => {
  let wrapper!: ReactWrapper;
  await act(async () => {
    wrapper = mount(
      <KVDBFormPage
        notifications={notifications}
        history={history}
        action="edit"
        match={{ params: { id: 'kvdb-1' } }}
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const renderCreatePage = async (): Promise<ReactWrapper> => {
  let wrapper!: ReactWrapper;
  await act(async () => {
    wrapper = mount(
      <KVDBFormPage
        notifications={notifications}
        history={history}
        action="create"
        match={{ params: {} }}
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const switchToYaml = async (wrapper: ReactWrapper) => {
  await act(async () => {
    wrapper.find('EuiButtonGroup').first().prop('onChange')('yaml' as any);
  });
  wrapper.update();
};

const typeYaml = async (wrapper: ReactWrapper, yaml: string) => {
  await act(async () => {
    (wrapper.find('YamlForm').first().prop('change') as (value: string) => void)(yaml);
  });
  wrapper.update();
};

const integrationErrors = (wrapper: ReactWrapper) =>
  wrapper
    .find('IntegrationComboBox')
    .find('.euiFormErrorText')
    .hostNodes()
    .map((node) => node.text());

const submitButton = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButton').filterWhere((button) => button.text().endsWith('Edit KVDB'));

const addEntry = async (wrapper: ReactWrapper, entry: { key?: string; value?: string }) => {
  await act(async () => {
    wrapper
      .find('EuiButtonEmpty')
      .filterWhere((button) => button.prop('children') === 'Add')
      .simulate('click');
  });
  wrapper.update();
  const keys = wrapper.find('input[placeholder="Key"]');
  const values = wrapper.find('textarea[placeholder^="Value"]');
  const last = keys.length - 1;
  await act(async () => {
    if (entry.key !== undefined) {
      keys.at(last).simulate('change', { target: { value: entry.key } });
    }
    if (entry.value !== undefined) {
      values.at(last).simulate('change', { target: { value: entry.value } });
      values.at(last).simulate('blur');
    }
  });
  wrapper.update();
};

describe('KVDBFormPage content validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataStore.kvdbs.getKVDB.mockResolvedValue({
      yaml: EXISTING_KVDB_YAML,
      document: { metadata: { title: 'ip-reputation' } },
    });
  });

  it('requires a key on an entry that has a value', async () => {
    const wrapper = await renderEditPage();
    await addEntry(wrapper, { value: 'tor-exit-node' });

    expect(wrapper.text()).toContain('Key is required');
    expect(submitButton(wrapper).prop('disabled')).toBe(true);
  });

  it('allows saving once the missing key is filled in', async () => {
    const wrapper = await renderEditPage();
    await addEntry(wrapper, { value: 'tor-exit-node' });
    await act(async () => {
      wrapper
        .find('input[placeholder="Key"]')
        .at(1)
        .simulate('change', {
          target: { value: '10.0.0.2' },
        });
    });
    wrapper.update();

    expect(wrapper.text()).not.toContain('Key is required');
    expect(submitButton(wrapper).prop('disabled')).toBe(false);
  });

  it('does not block saving on an empty entry', async () => {
    const wrapper = await renderEditPage();
    await addEntry(wrapper, {});

    expect(submitButton(wrapper).prop('disabled')).toBe(false);
  });
});

describe('KVDBFormPage on create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no validation errors in YAML before anything is edited', async () => {
    const wrapper = await renderCreatePage();
    await switchToYaml(wrapper);

    expect(wrapper.find('YamlForm').first().prop('isInvalid')).toBe(false);
    expect(wrapper.text()).not.toContain('Please address the highlighted errors.');
  });

  it('shows validation errors in YAML once the content has been edited', async () => {
    const wrapper = await renderCreatePage();
    await switchToYaml(wrapper);
    await typeYaml(wrapper, ['metadata:', '  title: ip-reputation', 'enabled: true'].join('\n'));

    expect(wrapper.text()).toContain('Please address the highlighted errors.');
    expect(wrapper.text()).toContain('Author is required');
  });

  it('does not ask for an integration before anything is edited', async () => {
    const wrapper = await renderCreatePage();
    expect(integrationErrors(wrapper)).toEqual([]);
  });

  it('asks for an integration once the content has been edited without one', async () => {
    const wrapper = await renderCreatePage();
    await act(async () => {
      wrapper
        .find('input[placeholder="Enter KVDB title"]')
        .simulate('change', { target: { value: 'ip-reputation' } });
    });
    wrapper.update();

    expect(integrationErrors(wrapper)).toEqual(['Select an integration']);
    expect(
      wrapper
        .find('EuiButton')
        .filterWhere((button) => button.text().endsWith('Create KVDB'))
        .prop('disabled')
    ).toBe(true);
  });
});
