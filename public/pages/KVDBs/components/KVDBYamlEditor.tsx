/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiCallOut, EuiCodeEditor, EuiCompressedFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import FormFieldHeader from '../../../components/FormFieldHeader';
import { KVDBFormModel, mapFormToYaml, mapYamlToForm } from '../utils/mappers';

interface KVDBYamlEditorProps {
  values: KVDBFormModel;
  onChange: (values: KVDBFormModel) => void;
  isInvalid: boolean;
  errors?: string[];
  parseDebounceMs?: number;
}

interface EditorState {
  errors: string[] | null;
  value: string;
}

export const KVDBYamlEditor: React.FC<KVDBYamlEditorProps> = ({
  values,
  onChange,
  isInvalid,
  errors,
  parseDebounceMs = 500,
}) => {
  const [state, setState] = useState<EditorState>({
    errors: null,
    value: mapFormToYaml(values),
  });

  const timerRef = useRef<number | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const newYaml = mapFormToYaml(values);
    setState((s) => {
      if (isFocusedRef.current) return s;
      if (s.value === newYaml) return s;
      return { ...s, value: newYaml };
    });
  }, [values]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const tryParseAndNotify = (text: string) => {
    if (!text || !text.trim()) {
      setState((prev) => ({ ...prev, errors: ['KVDB cannot be empty'] }));
      return;
    }
    try {
      const parsed = mapYamlToForm(text);
      onChange(parsed);
      setState((prev) => ({ ...prev, errors: null }));
    } catch (err) {
      setState((prev) => ({ ...prev, errors: ['Invalid YAML'] }));
      console.warn('Security Analytics - KVDB Editor - YAML parse', err);
    }
  };

  const onChangeYaml = (text: string) => {
    setState((prev) => ({ ...prev, value: text }));
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => tryParseAndNotify(text), parseDebounceMs);
  };

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
        label={<FormFieldHeader headerTitle="Define KVDB in YAML" />}
        fullWidth
      >
        <>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            Use the YAML editor to define a custom KVDB.
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeEditor
            mode="yaml"
            width="100%"
            value={state.value}
            onChange={onChangeYaml}
            onFocus={onFocus}
            data-test-subj="kvdb_yaml_editor"
          />
        </>
      </EuiCompressedFormRow>
    </>
  );
};
