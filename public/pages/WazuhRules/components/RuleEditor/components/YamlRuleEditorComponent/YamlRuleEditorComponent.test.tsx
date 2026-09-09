/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { YamlRuleEditorComponent } from './YamlRuleEditorComponent';
import { Rule } from '../../../../../../../types';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiCodeEditor: ({ onChange, value, ['data-test-subj']: testSubj }: any) => (
      <textarea
        data-test-subj={testSubj}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

const baseRule: Rule = {
  id: '',
  category: '',
  log_source: {},
  tags: [],
  false_positives: [],
  level: '',
  status: '',
  enabled: true,
  detection: '',
  metadata: {
    title: '',
    author: '',
    description: '',
    references: [],
    documentation: '',
    supports: [],
  },
  mitre: '',
  compliance: '',
} as unknown as Rule;

describe('YamlRuleEditorComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderEditor = (flushRef?: React.MutableRefObject<(() => boolean) | null>) => {
    const change = jest.fn();
    const utils = render(
      <YamlRuleEditorComponent
        rule={baseRule}
        change={change}
        isInvalid={false}
        flushRef={flushRef}
      />
    );
    return { change, ...utils };
  };

  it('does not call change before the debounce elapses, calls it once after', () => {
    const { change, getByTestId } = renderEditor();
    const editor = getByTestId('rule_yaml_editor');

    fireEvent.change(editor, {
      target: { value: 'level: high\ndetection:\n  condition: a\nmetadata:\n  title: Test' },
    });

    expect(change).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(change).toHaveBeenCalledTimes(1);
  });

  it('flushRef.current() applied before the timer calls change exactly once, later tick adds none', () => {
    const flushRef: React.MutableRefObject<(() => Promise<unknown> | null) | null> = {
      current: null,
    };
    const { change, getByTestId } = renderEditor(flushRef);
    const editor = getByTestId('rule_yaml_editor');

    fireEvent.change(editor, {
      target: { value: 'level: high\ndetection:\n  condition: a\nmetadata:\n  title: Test' },
    });

    let applied: Promise<unknown> | null = null;
    act(() => {
      applied = flushRef.current!();
    });

    expect(applied).not.toBeNull();
    expect(change).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(change).toHaveBeenCalledTimes(1);
  });

  it('flush with nothing pending returns false and does not call change', () => {
    const flushRef: React.MutableRefObject<(() => Promise<unknown> | null) | null> = {
      current: null,
    };
    const { change } = renderEditor(flushRef);

    let applied: Promise<unknown> | null = null;
    act(() => {
      applied = flushRef.current!();
    });

    expect(applied).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('renders "Invalid YAML" for malformed YAML', () => {
    const { getByTestId, getByText } = renderEditor();
    const editor = getByTestId('rule_yaml_editor');

    fireEvent.change(editor, { target: { value: ':: not yaml: [' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getByText('Invalid YAML')).toBeTruthy();
  });

  it('renders the distinct shape-failure message for a scalar document', () => {
    const { getByTestId, getByText } = renderEditor();
    const editor = getByTestId('rule_yaml_editor');

    fireEvent.change(editor, { target: { value: 'just a scalar string' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getByText('The rule must be a YAML mapping of rule fields.')).toBeTruthy();
  });

  it('renders "Rule cannot be empty" for an empty value', () => {
    const { getByTestId, getByText } = renderEditor();
    const editor = getByTestId('rule_yaml_editor');

    fireEvent.change(editor, { target: { value: '' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getByText('Rule cannot be empty')).toBeTruthy();
  });
});
