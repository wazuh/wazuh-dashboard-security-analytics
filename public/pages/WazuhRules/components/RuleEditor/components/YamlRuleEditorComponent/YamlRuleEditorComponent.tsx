/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState, useRef } from 'react';
import { load } from 'js-yaml';
import {
  EuiCallOut,
  EuiCodeEditor,
  EuiCompressedFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import FormFieldHeader from '../../../../../../components/FormFieldHeader';
import {
  mapRuleToYamlObject,
  mapYamlObjectToRule,
  mapYamlObjectToYamlString,
} from '../../../../utils/mappers';
import { RuleShapeError } from '../../../../utils/ruleShape';
import { Rule } from '../../../../../../../types';

export interface YamlRuleEditorComponentProps {
  rule: Rule;
  change: (rule: Rule) => Promise<unknown> | void;
  isInvalid: boolean;
  errors?: string[];
  parseDebounceMs?: number;
  flushRef?: React.MutableRefObject<(() => Promise<unknown> | null) | null>;
}

export interface YamlEditorState {
  errors: string[] | null;
  value?: string;
}

export const YamlRuleEditorComponent: React.FC<YamlRuleEditorComponentProps> = ({
  rule,
  change,
  isInvalid,
  errors,
  parseDebounceMs = 500,
  flushRef,
}) => {
  const yamlObject = mapRuleToYamlObject(rule);

  const [state, setState] = useState<YamlEditorState>({
    errors: null,
    value: mapYamlObjectToYamlString(yamlObject),
  });

  const timerRef = useRef<number | null>(null);
  const isFocusedRef = useRef(false);
  const pendingValueRef = useRef<string | null>(null);

  useEffect(() => {
    const newYaml = mapYamlObjectToYamlString(mapRuleToYamlObject(rule));
    setState((s) => {
      if (isFocusedRef.current) return s;
      if (s.value === newYaml) return s;
      return { ...s, value: newYaml };
    });
  }, [rule]);

  const tryParseAndNotify = (value: string): Promise<unknown> | null => {
    pendingValueRef.current = null;
    if (!value || value.trim() === '') {
      setState((prev) => ({ ...prev, errors: ['Rule cannot be empty'] }));
      return null;
    }

    let yamlObj: unknown;
    try {
      yamlObj = load(value);
    } catch (err) {
      setState((prev) => ({ ...prev, errors: ['Invalid YAML'] }));
      console.warn('Ruleset Management - Rule Editor - Yaml load', err);
      return null;
    }

    try {
      const parsedRule = mapYamlObjectToRule(yamlObj);
      const applied = change(parsedRule);
      setState((prev) => ({ ...prev, errors: null }));
      return applied;
    } catch (err) {
      const message = err instanceof RuleShapeError ? err.message : 'The rule could not be read.';
      setState((prev) => ({ ...prev, errors: [message] }));
      console.warn('Ruleset Management - Rule Editor - Yaml map', err);
      return null;
    }
  };

  const onChange = (value: string) => {
    setState((prev) => ({ ...prev, value }));
    pendingValueRef.current = value;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      tryParseAndNotify(value);
    }, parseDebounceMs);
  };

  // Returns the parent's setValues promise so a caller can wait for revalidation
  // instead of guessing at a timer: Formik revalidates asynchronously.
  const flush = (): Promise<unknown> | null => {
    if (pendingValueRef.current === null) return null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const pending = pendingValueRef.current;
    return tryParseAndNotify(pending);
  };

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
    return () => {
      if (flushRef) flushRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onFocus = () => {
    isFocusedRef.current = true;
  };

  const renderErrors = () => {
    const callout = (errs: string[]) => (
      <EuiCallOut size="m" color="danger" title="Please address the highlighted errors.">
        <ul>
          {errs.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </EuiCallOut>
    );

    if (state.errors && state.errors.length > 0) return callout(state.errors);
    if (isInvalid && errors && errors.length > 0) return callout(errors);
    return null;
  };

  return (
    <>
      {renderErrors()}
      <EuiSpacer size="s" />
      <EuiCompressedFormRow
        label={<FormFieldHeader headerTitle={'Define rule in YAML'} />}
        fullWidth
      >
        <>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            Use the YAML editor to define a sigma rule. See{' '}
            <EuiLink href="https://github.com/SigmaHQ/sigma-specification">
              Sigma specification
            </EuiLink>{' '}
            for rule structure and schema.
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeEditor
            mode="yaml"
            width="100%"
            value={state.value}
            onChange={onChange}
            onFocus={onFocus}
            data-test-subj={'rule_yaml_editor'}
          />
        </>
      </EuiCompressedFormRow>
    </>
  );
};
