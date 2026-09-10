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
import { InfoItem, LabelWithInfo } from './LabelWithInfo';
import { CHECK_EXPRESSION_HELP, CHECK_EXPRESSION_INFO, CHECK_LIST_HELP } from '../hints';
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
  /** Called with a path when the user leaves a control, to gate its error. */
  onBlurPath?: (path: string) => void;
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
 * `check` — an expression or a list of `{ field: condition }`. Anything else is
 * carried as YAML. Labelled `Format`, since the filter form owns `Type`.
 */
export const CheckEditor: React.FC<CheckEditorProps> = ({
  path,
  model,
  onChange,
  errors = {},
  onBlurPath,
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
      label="Check"
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
        <EuiCompressedFormRow
          label={
            <LabelWithInfo
              label={fieldLabel('Format')}
              title="Check formats"
              ariaLabel="Check format information"
            >
              <InfoItem term="None">
                No check. Every event that reaches this point is accepted.
              </InfoItem>
              <InfoItem term="Expression">
                A single condition over the event&apos;s fields, for example{' '}
                <code>$process.name == &apos;haproxy&apos;</code>.
              </InfoItem>
              <InfoItem term="List">
                Several field/value conditions that must all pass, in order. A condition can be a
                helper call, a field reference, or a literal value.
              </InfoItem>
            </LabelWithInfo>
          }
          fullWidth={true}
        >
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
            label={
              <LabelWithInfo
                label={fieldLabel('Expression')}
                title="Check expressions"
                ariaLabel="Check expression information"
              >
                {CHECK_EXPRESSION_INFO}
              </LabelWithInfo>
            }
            fullWidth={true}
            isInvalid={!!errors[path]}
            error={errors[path]}
            helpText={CHECK_EXPRESSION_HELP}
          >
            <EuiCompressedFieldText
              placeholder="$process.name == 'haproxy'"
              value={model.expression}
              onChange={(e) => onChange({ mode: 'expression', expression: e.target.value })}
              onBlur={() => onBlurPath?.(path)}
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
            onBlurPath={onBlurPath}
            fieldPlaceholder="_tmp_json.accountId"
            valuePlaceholder="exists()"
            helpText={CHECK_LIST_HELP}
            addLabel="Add condition"
            emptyLabel="No conditions yet."
          />
        )}
      </>
    </YamlSlot>
  );
};
