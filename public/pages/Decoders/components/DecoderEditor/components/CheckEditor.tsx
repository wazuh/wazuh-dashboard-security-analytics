/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import YAML from 'yaml';
import {
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { fieldLabel } from '../labels';
import { CHECK_HINT, NORMALIZE_CHECK_HINT } from '../hints';
import { CheckModel } from '../DecoderEditorFormModel';
import { checkToModel, modelToCheck, textToValue } from '../mappers';
import { MapRows } from './MapRows';
import { YamlSlot } from './YamlSlot';

const CHECK_MODE_OPTIONS = [
  { value: 'none', text: 'None' },
  { value: 'expression', text: 'Expression' },
  { value: 'list', text: 'List' },
];

export interface CheckEditorProps {
  /** Formik path of the check, e.g. `check` or `normalize[0].check`. Not user-facing. */
  path: string;
  /** What this check is called on screen. */
  label?: string;
  /** A nested check gets a shorter hint than the decoder-level one. */
  nested?: boolean;
  model: CheckModel;
  onChange: (model: CheckModel) => void;
  errors?: Record<string, string>;
}

const checkToYamlText = (model: CheckModel): string => {
  const value = modelToCheck(model);
  if (value === undefined) return '';
  return YAML.stringify(value, { lineWidth: 0 }).trimEnd();
};

/**
 * `check` — the schema's `_check`: either a conditional expression or a list of
 * `{ field: condition }` items, both of which this editor models.
 *
 * A `check` holding anything else is carried as YAML and the visual view is
 * disabled for it, rather than being reshaped into something the engine did not
 * mean.
 */
export const CheckEditor: React.FC<CheckEditorProps> = ({
  path,
  label = 'Check',
  nested = false,
  model,
  onChange,
  errors = {},
}) => {
  const onYamlChange = useCallback(
    (text: string) => {
      onChange(text.trim() === '' ? { mode: 'none' } : checkToModel(textToValue(text)));
    },
    [onChange]
  );

  const onModeChange = useCallback(
    (mode: string) => {
      if (mode === 'none') return onChange({ mode: 'none' });
      if (mode === 'expression') {
        return onChange({
          mode: 'expression',
          expression: model.mode === 'expression' ? model.expression : '',
        });
      }
      return onChange({ mode: 'list', rows: model.mode === 'list' ? model.rows : [] });
    },
    [model, onChange]
  );

  return (
    <YamlSlot
      slotId={path}
      label={label}
      yamlValue={checkToYamlText(model)}
      onYamlChange={onYamlChange}
      error={errors[path]}
      structuredUnavailableReason={
        model.mode === 'yaml'
          ? 'This check is neither an expression nor a list, so it can only be edited as YAML.'
          : undefined
      }
    >
      <>
        <EuiText size="xs" color="subdued">
          {nested ? NORMALIZE_CHECK_HINT : CHECK_HINT}
        </EuiText>
        <EuiSpacer size="s" />

        <EuiCompressedFormRow label={fieldLabel('Type')} fullWidth={true}>
          <EuiCompressedSelect
            options={CHECK_MODE_OPTIONS}
            value={model.mode === 'yaml' ? 'none' : model.mode}
            onChange={(e) => onModeChange(e.target.value)}
            data-test-subj={`${path}.mode`}
          />
        </EuiCompressedFormRow>
        <EuiSpacer size="m" />

        {model.mode === 'none' && (
          <EuiText size="s" color="subdued">
            <p>No check. Every event reaches this point.</p>
          </EuiText>
        )}

        {model.mode === 'expression' && (
          <EuiCompressedFormRow
            label={fieldLabel('Expression')}
            fullWidth={true}
            isInvalid={!!errors[path]}
            error={errors[path]}
            helpText="Combine with NOT, AND, OR or a comparison operator, e.g. $event.module == syslog AND NOT $error.code"
          >
            <EuiCompressedFieldText
              placeholder="$event.module == syslog"
              value={model.expression}
              onChange={(e) => onChange({ mode: 'expression', expression: e.target.value })}
              isInvalid={!!errors[path]}
              data-test-subj={`${path}.expression`}
            />
          </EuiCompressedFormRow>
        )}

        {model.mode === 'list' && (
          <MapRows
            path={path}
            singleLineValue
            rows={model.rows.map((row) => ({ field: row.field, value: row.condition }))}
            onChange={(rows) =>
              onChange({
                mode: 'list',
                rows: rows.map((row) => ({ field: row.field, condition: row.value })),
              })
            }
            errors={errors}
            fieldPlaceholder="Field (e.g. event.module)"
            valuePlaceholder="Condition (e.g. syslog, $other.field, exists())"
            helpText={
              <>
                Every condition must pass, in order. A condition can be a literal, a field reference
                such as <code>$other.field</code>, or a helper such as <code>exists()</code>.
              </>
            }
            addLabel="Add condition"
            emptyLabel="No conditions. All of them must pass, in order."
          />
        )}
      </>
    </YamlSlot>
  );
};
