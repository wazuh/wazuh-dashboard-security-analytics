/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { mount } from 'enzyme';
import { LogTestResult } from './LogTestResult';
import { LogTestResponse } from '../../../../types';

const OUTPUT = { process: { name: 'sshd' }, event: { outcome: 'failure' } };

const NORMALIZATION_ONLY: LogTestResponse = {
  status: '200',
  message: {
    normalization: { output: OUTPUT, asset_traces: [], validation: { valid: true, errors: [] } },
  },
};

const DETECTION_ONLY: LogTestResponse = {
  status: '200',
  message: {
    detection: {
      status: 'success',
      rules_evaluated: 1,
      rules_matched: 1,
      matches: [
        {
          rule: { id: 'r1', title: 'UX test failed sshd login', level: 'medium', tags: [] },
          matched_conditions: ["process.name matched 'sshd'"],
        },
      ],
    },
  },
};

const ENVIRONMENT_MISSING: LogTestResponse = {
  status: '200',
  message: {
    normalization: {
      status: 'error',
      error: { message: "The 'test' environment does not exist.", code: 'PARSE_ERROR' },
    },
    detection: { status: 'skipped', reason: 'Engine processing failed' },
  },
};

const subj = (wrapper: any, id: string) => wrapper.find(`[data-test-subj="${id}"]`).hostNodes();

describe('<LogTestResult />', () => {
  it('names the scope and space a result belongs to', () => {
    const wrapper = mount(<LogTestResult result={DETECTION_ONLY} scope="detection" space="test" />);

    expect(subj(wrapper, 'logTestResultScope').text()).toBe('Detection only · test space');
    expect(subj(wrapper, 'logTestVerdict').text()).toBe('1 rule matched');
  });

  it('shows one panel without tabs for a partial scope', () => {
    const wrapper = mount(<LogTestResult result={DETECTION_ONLY} scope="detection" space="test" />);

    expect(wrapper.find('EuiTab').length).toBe(0);
    expect(wrapper.text()).toContain('UX test failed sshd login');
    expect(wrapper.text()).not.toContain('No normalization data');
  });

  it('keeps both tabs for the combined test', () => {
    const wrapper = mount(<LogTestResult result={ENVIRONMENT_MISSING} scope="full" space="test" />);

    expect(wrapper.find('EuiTab').map((tab: any) => tab.text())).toEqual([
      'Normalization',
      'Detection',
    ]);
  });

  it('hands the normalized output over to a detection-only test', () => {
    const onTestDetectionWithOutput = jest.fn();
    const wrapper = mount(
      <LogTestResult
        result={NORMALIZATION_ONLY}
        scope="normalization"
        space="test"
        onTestDetectionWithOutput={onTestDetectionWithOutput}
      />
    );

    expect(subj(wrapper, 'logTestVerdict').text()).toBe('Parsed into 2 fields');
    subj(wrapper, 'logTestHandoffToDetection').simulate('click');

    expect(onTestDetectionWithOutput).toHaveBeenCalledWith(OUTPUT);
  });

  it('explains a space the Engine never loaded and offers Detection only (#1694)', () => {
    const onSwitchToDetection = jest.fn();
    const wrapper = mount(
      <LogTestResult
        result={ENVIRONMENT_MISSING}
        scope="full"
        space="test"
        onSwitchToDetection={onSwitchToDetection}
      />
    );

    const callout = subj(wrapper, 'logTestEngineEnvironmentMissing');
    expect(callout.text()).toContain('The Engine has no environment for the test space');
    expect(callout.text()).toContain('Rules do not depend on the Engine');
    expect(subj(wrapper, 'logTestVerdict').text()).toBe('Engine environment not available');

    callout.find('button').simulate('click');
    expect(onSwitchToDetection).toHaveBeenCalled();
  });

  it('keeps the plain normalization error for any other Engine failure', () => {
    const wrapper = mount(
      <LogTestResult
        result={{
          status: '200',
          message: {
            normalization: {
              status: 'error',
              error: { message: 'invalid value', code: 'ENGINE_ERROR' },
            },
          },
        }}
        scope="normalization"
        space="test"
      />
    );

    expect(subj(wrapper, 'logTestEngineEnvironmentMissing').length).toBe(0);
    expect(wrapper.text()).toContain('Normalization error');
    expect(wrapper.text()).toContain('invalid value');
  });
});
