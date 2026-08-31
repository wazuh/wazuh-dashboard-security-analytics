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
      const dropdownDisplay = mount(option.dropdownDisplay);
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
