/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { LogTestForm, LogTestFormData, LogTestFormProps } from './LogTestForm';
import { setupCoreStart } from '../../../../test/utils/helpers';

beforeAll(() => {
  setupCoreStart();
});

const buildFormData = (overrides: Partial<LogTestFormData> = {}): LogTestFormData => ({
  queue: undefined,
  location: '',
  event: '',
  traceLevel: 'NONE',
  space: 'draft',
  metadataFields: [],
  integration: '',
  normalizedEvent: '',
  ...overrides,
});

const mountLogTestForm = async (props: Partial<LogTestFormProps> = {}) => {
  const onFormChange = jest.fn();
  const onMetadataFieldsChange = jest.fn();
  let wrapper: any;
  await act(async () => {
    wrapper = mount(
      <LogTestForm
        formData={buildFormData()}
        errors={{}}
        onFormChange={onFormChange}
        onMetadataFieldsChange={onMetadataFieldsChange}
        integrationOptions={[]}
        {...props}
      />
    );
  });
  wrapper.update();
  return { wrapper, onFormChange, onMetadataFieldsChange };
};

const EXPECTED_TRACE_LEVEL_DESCRIPTIONS: Record<string, string> = {
  NONE: 'Only the final normalized output. Use for quick checks.',
  ASSET_ONLY: 'Output plus the list of decoders that matched.',
  ALL: 'Full trace including every decoder attempted. Use for debugging decoder issues.',
};

describe('<LogTestForm /> trace level', () => {
  it('gives each Trace level option a label and a brief description of what it returns', async () => {
    const { wrapper } = await mountLogTestForm();

    const traceLevelSelect = wrapper.find('EuiSuperSelect');
    expect(traceLevelSelect.length).toBe(1);

    const options = traceLevelSelect.prop('options') as Array<{
      value: string;
      inputDisplay: string;
      dropdownDisplay: React.ReactElement;
    }>;

    expect(options.map((option) => option.value)).toEqual(['NONE', 'ASSET_ONLY', 'ALL']);

    options.forEach((option) => {
      // Wazuh: each dropdownDisplay is a fragment of two nodes, and enzyme's
      // `text()` only runs on a single node, so it is mounted wrapped.
      const dropdownDisplay = mount(<div>{option.dropdownDisplay}</div>);
      expect(dropdownDisplay.text()).toContain(option.inputDisplay);
      expect(dropdownDisplay.text()).toContain(EXPECTED_TRACE_LEVEL_DESCRIPTIONS[option.value]);
    });
  });

  it('reports the selected trace level back through onFormChange', async () => {
    const { wrapper, onFormChange } = await mountLogTestForm();

    wrapper.find('EuiSuperSelect').prop('onChange')!('ASSET_ONLY');

    expect(onFormChange).toHaveBeenCalledWith('traceLevel', 'ASSET_ONLY');
  });
});

const INTEGRATIONS = [
  { id: 'with-rules', label: 'ux-test-int', value: 'ux-test-int', rulesCount: 1 },
  { id: 'no-rules', label: 'ux-sshd-decoders', value: 'ux-sshd-decoders', rulesCount: 0 },
];

describe('<LogTestForm /> scopes', () => {
  // The help icon renders as the icon mock's text, which is not part of the heading.
  const sections = (wrapper: any) =>
    wrapper.find('EuiTitle h3').map((h: any) => h.text().replace('EuiIconMock', '').trim());

  it('asks for the raw event and an integration in the combined test', async () => {
    const { wrapper } = await mountLogTestForm({ scope: 'full', integrationOptions: INTEGRATIONS });

    expect(sections(wrapper)).toEqual(['Normalization', 'Detection', 'Log event']);
    // Wazuh: no longer marked optional; Normalization only covers a test without rules.
    expect(wrapper.find('IntegrationComboBox').text()).not.toContain('optional');
    expect(wrapper.find('NormalizedEventEditor').length).toBe(0);
  });

  it('drops the integration for Normalization only', async () => {
    const { wrapper } = await mountLogTestForm({ scope: 'normalization' });

    expect(sections(wrapper)).toEqual(['Normalization', 'Log event']);
    expect(wrapper.find('IntegrationComboBox').length).toBe(0);
  });

  it('swaps the raw event for a normalized JSON event in Detection only', async () => {
    const { wrapper } = await mountLogTestForm({ scope: 'detection' });

    expect(sections(wrapper)).toEqual(['Detection']);
    expect(wrapper.find('EuiSuperSelect').length).toBe(0);
    expect(wrapper.find('EuiTextArea').length).toBe(0);
    expect(wrapper.find('NormalizedEventEditor').length).toBe(1);
  });

  it('lists integrations without rules as disabled in Detection only', async () => {
    const { wrapper } = await mountLogTestForm({
      scope: 'detection',
      integrationOptions: INTEGRATIONS,
    });

    expect(wrapper.find('IntegrationComboBox').prop('options')).toEqual([
      INTEGRATIONS[0],
      { ...INTEGRATIONS[1], disabled: true, label: 'ux-sshd-decoders (no rules in this space)' },
    ]);
  });

  it('keeps every integration selectable in the combined test', async () => {
    const { wrapper } = await mountLogTestForm({ scope: 'full', integrationOptions: INTEGRATIONS });

    expect(wrapper.find('IntegrationComboBox').prop('options')).toEqual(INTEGRATIONS);
  });

  it('shows the required-integration error', async () => {
    const { wrapper } = await mountLogTestForm({
      scope: 'full',
      errors: { integration: 'Integration is required' },
    });

    expect(wrapper.find('IntegrationComboBox').prop('error')).toBe('Integration is required');
  });
});
