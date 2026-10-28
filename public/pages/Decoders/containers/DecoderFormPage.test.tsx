/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { DecoderFormPage } from './DecoderFormPage';
import { decoderFormDefaultValue } from '../utils/constants';
import { setupCoreStart } from '../../../../test/utils/helpers';

beforeAll(() => {
  setupCoreStart();
});

// Schema validation runs in a Web Worker jsdom has no equivalent for; it is
// covered in jsonSchemaValidation.test.
jest.mock('../../../utils/jsonSchemaValidation', () => ({
  validateWithJsonSchemaAsync: jest.fn().mockResolvedValue({}),
}));

const EXISTING_DECODER_YAML = [
  'id: 3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  'name: decoder/syslog/0',
  'enabled: true',
  'metadata:',
  '  title: Syslog',
  '  author: Wazuh',
  '  description: Parses syslog events',
  'normalize:',
  '  - map:',
  '      - event.kind: event',
].join('\n');

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    decoders: {
      getDecoder: jest.fn(),
      createDecoder: jest.fn().mockResolvedValue({ message: 'created' }),
      updateDecoder: jest.fn().mockResolvedValue({ message: 'updated' }),
    },
    integrations: {
      listIntegrationOptions: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');
const { validateWithJsonSchemaAsync } = jest.requireMock('../../../utils/jsonSchemaValidation');

const notifications: any = {
  toasts: { addDanger: jest.fn(), addSuccess: jest.fn(), addWarning: jest.fn() },
};

const history: any = { push: jest.fn(), replace: jest.fn(), location: { search: '' } };

const renderPage = async (
  action: 'create' | 'edit',
  params: { id?: string } = {}
): Promise<ReactWrapper> => {
  let wrapper!: ReactWrapper;
  await act(async () => {
    wrapper = mount(
      <DecoderFormPage
        notifications={notifications}
        history={history}
        location={{ search: '' } as any}
        action={action}
        match={{ params: { id: params.id ?? '' } } as any}
      />
    );
  });
  wrapper.update();
  return wrapper;
};

const subj = (wrapper: ReactWrapper, name: string) =>
  wrapper.find(`[data-test-subj="${name}"]`).hostNodes();

const integrationErrors = (wrapper: ReactWrapper) =>
  wrapper
    .find('IntegrationComboBox')
    .find('.euiFormErrorText')
    .hostNodes()
    .map((node) => node.text());

// The combo box reports a blur from a native focusout on its container.
const blurIntegration = async (wrapper: ReactWrapper) => {
  await act(async () => {
    wrapper
      .find('IntegrationComboBox')
      .find('input')
      .first()
      .getDOMNode()
      .dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
  wrapper.update();
};

const pickIntegration = async (wrapper: ReactWrapper) => {
  await act(async () => {
    wrapper.find('IntegrationComboBox').first().prop('onChange')([
      { id: 'integration-1', value: 'wazuh-core', label: 'wazuh-core' },
    ]);
  });
  wrapper.update();
};

// Lets the debounced schema validation settle.
const waitForSchemaValidation = async (wrapper: ReactWrapper) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  wrapper.update();
};

const editName = async (wrapper: ReactWrapper, value: string) => {
  await act(async () => {
    subj(wrapper, 'name').simulate('change', { target: { value } });
  });
  wrapper.update();
};

const switchTo = async (wrapper: ReactWrapper, id: 'visual' | 'yaml') => {
  await act(async () => {
    wrapper.find('EuiButtonGroup[data-test-subj="change-editor-type"]').first().prop('onChange')(
      id as any
    );
  });
  wrapper.update();
};

describe('DecoderFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataStore.decoders.getDecoder.mockResolvedValue({
      yaml: EXISTING_DECODER_YAML,
      document: { name: 'decoder/syslog/0', metadata: { title: 'Syslog' } },
      integrations: ['syslog'],
    });
  });

  it('opens in the visual editor', async () => {
    const wrapper = await renderPage('create');
    expect(
      wrapper.find('EuiButtonGroup[data-test-subj="change-editor-type"]').first().prop('idSelected')
    ).toBe('visual');
    expect(subj(wrapper, 'decoder-visual-editor').length).toBeGreaterThan(0);
  });

  it('offers both editors', async () => {
    const wrapper = await renderPage('create');
    const options = wrapper
      .find('EuiButtonGroup[data-test-subj="change-editor-type"]')
      .first()
      .prop('options') as Array<{ id: string; label: string }>;
    expect(options.map((option) => option.id)).toEqual(['visual', 'yaml']);
    expect(options.map((option) => option.label)).toEqual(['Visual Editor', 'YAML Editor']);
  });

  it('still shows the starter template in YAML on an untouched create', async () => {
    const wrapper = await renderPage('create');
    await switchTo(wrapper, 'yaml');
    expect(wrapper.find('YamlForm').first().prop('value')).toBe(decoderFormDefaultValue);
  });

  it('shows the real document in YAML once the form has been edited', async () => {
    const wrapper = await renderPage('create');

    await act(async () => {
      subj(wrapper, 'name').simulate('change', { target: { value: 'decoder/mine/0' } });
    });
    wrapper.update();
    await switchTo(wrapper, 'yaml');

    const value = wrapper.find('YamlForm').first().prop('value') as string;
    expect(value).toContain('name: decoder/mine/0');
    expect(value).not.toContain('Placeholder Decoder');
  });

  it('blocks submission until an integration is chosen', async () => {
    const wrapper = await renderPage('create');
    const button = subj(wrapper, 'submit-decoder').first();
    expect(button.prop('disabled')).toBe(true);
  });

  it('loads an existing decoder into the visual editor', async () => {
    const wrapper = await renderPage('edit', { id: 'abc' });
    expect(subj(wrapper, 'name').prop('value')).toBe('decoder/syslog/0');
    expect(subj(wrapper, 'metadata.title').prop('value')).toBe('Syslog');
    expect(subj(wrapper, 'normalize-yaml').length).toBeGreaterThan(0);
  });

  it('submits the document built from the form, not raw YAML', async () => {
    const wrapper = await renderPage('edit', { id: 'abc' });

    await act(async () => {
      subj(wrapper, 'submit-decoder').first().simulate('click');
    });

    expect(DataStore.decoders.updateDecoder).toHaveBeenCalledWith('abc', {
      document: expect.objectContaining({
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'decoder/syslog/0',
        normalize: [{ map: [{ 'event.kind': 'event' }] }],
      }),
    });
  });

  it('blocks submission while the YAML does not parse', async () => {
    const wrapper = await renderPage('edit', { id: 'abc' });
    await switchTo(wrapper, 'yaml');

    await act(async () => {
      (wrapper.find('YamlForm').first().prop('change') as (value: string) => void)(
        'name: [unclosed'
      );
    });
    wrapper.update();

    expect(subj(wrapper, 'submit-decoder').first().prop('disabled')).toBe(true);
  });

  it('keeps the last valid document when unparseable YAML is abandoned', async () => {
    // Matches the rules editor: broken text never reaches the document, so
    // switching back shows the last valid state rather than an empty form.
    const wrapper = await renderPage('edit', { id: 'abc' });
    await switchTo(wrapper, 'yaml');

    await act(async () => {
      (wrapper.find('YamlForm').first().prop('change') as (value: string) => void)(
        'name: [unclosed'
      );
    });
    wrapper.update();
    await switchTo(wrapper, 'visual');

    expect(subj(wrapper, 'name').prop('value')).toBe('decoder/syslog/0');
  });

  describe('on create', () => {
    beforeEach(() => {
      validateWithJsonSchemaAsync.mockResolvedValue({ '': 'Document is not valid' });
    });

    afterEach(() => {
      validateWithJsonSchemaAsync.mockResolvedValue({});
    });

    it('shows no validation errors in YAML before anything is edited', async () => {
      const wrapper = await renderPage('create');
      await switchTo(wrapper, 'yaml');
      await waitForSchemaValidation(wrapper);

      expect(wrapper.find('YamlForm').first().prop('isInvalid')).toBe(false);
      expect(wrapper.text()).not.toContain('Please address the highlighted errors.');
    });

    it('shows validation errors in YAML once the form has been edited', async () => {
      const wrapper = await renderPage('create');
      await editName(wrapper, 'decoder/mine/0');
      await switchTo(wrapper, 'yaml');
      await waitForSchemaValidation(wrapper);

      expect(wrapper.text()).toContain('Please address the highlighted errors.');
    });

    it('shows a YAML syntax error typed before any other edit', async () => {
      const wrapper = await renderPage('create');
      await switchTo(wrapper, 'yaml');

      await act(async () => {
        (wrapper.find('YamlForm').first().prop('change') as (value: string) => void)(
          'name: [unclosed'
        );
      });
      wrapper.update();

      expect(wrapper.find('YamlForm').first().prop('isInvalid')).toBe(true);
    });

    it('does not ask for an integration before anything is edited', async () => {
      const wrapper = await renderPage('create');
      expect(integrationErrors(wrapper)).toEqual([]);
    });

    it('does not ask for an integration when another field is edited', async () => {
      const wrapper = await renderPage('create');
      await editName(wrapper, 'decoder/mine/0');

      expect(integrationErrors(wrapper)).toEqual([]);
      expect(subj(wrapper, 'submit-decoder').first().prop('disabled')).toBe(true);
    });

    it('does not ask for an integration when another field is touched and cleared', async () => {
      const wrapper = await renderPage('create');
      await editName(wrapper, 'decoder/mine/0');
      await editName(wrapper, '');
      await act(async () => {
        subj(wrapper, 'name').simulate('blur');
      });
      wrapper.update();

      expect(integrationErrors(wrapper)).toEqual([]);
    });

    it('does not ask for an integration when another field is visited', async () => {
      const wrapper = await renderPage('create');
      await act(async () => {
        subj(wrapper, 'name').simulate('focus');
        subj(wrapper, 'name').simulate('blur');
      });
      wrapper.update();

      expect(integrationErrors(wrapper)).toEqual([]);
      expect(subj(wrapper, 'submit-decoder').first().prop('disabled')).toBe(true);
    });

    it('asks for an integration when its field is left empty, until one is picked', async () => {
      DataStore.integrations.listIntegrationOptions.mockResolvedValueOnce([
        { id: 'integration-1', title: 'wazuh-core' },
      ]);
      const wrapper = await renderPage('create');
      await blurIntegration(wrapper);

      expect(integrationErrors(wrapper)).toEqual(['Select an integration']);

      await pickIntegration(wrapper);

      expect(integrationErrors(wrapper)).toEqual([]);
    });
  });
});
