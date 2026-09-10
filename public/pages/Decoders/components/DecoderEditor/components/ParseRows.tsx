/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiPanel,
  EuiFlexGroup,
  EuiFormHelpText,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { fieldLabel } from '../labels';
import { FormFieldArray } from '../../../../../components/FormFieldArray';
import { ParserRow } from '../DecoderEditorFormModel';

export interface ParseRowsProps {
  /** Formik path of the array, e.g. `normalize[0].parsers`. */
  path: string;
  rows: ParserRow[];
  onChange: (rows: ParserRow[]) => void;
  errors?: Record<string, string>;
  /** Shown once under the list — say what a parser is for and show a real example. */
  helpText?: React.ReactNode;
  /** Called with a row's path when the user leaves it, to gate its error. */
  onBlurPath?: (path: string) => void;
}

/** `parse|<field>` keys, split into rows because Formik splits paths on dots. */
export const ParseRows: React.FC<ParseRowsProps> = ({
  path,
  rows,
  onChange,
  errors = {},
  helpText,
  onBlurPath,
}) => {
  const update = (index: number, patch: Partial<ParserRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const sectionError = errors[path];

  return (
    <div data-test-subj={`parse-rows-${path}`}>
      {helpText && (
        <>
          <EuiFormHelpText>{helpText}</EuiFormHelpText>
          <EuiSpacer size="s" />
        </>
      )}

      {sectionError && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            title={sectionError}
            data-test-subj={`${path}.sectionError`}
          />
          <EuiSpacer size="s" />
        </>
      )}

      {rows.length === 0 && (
        <EuiText size="s" color="subdued">
          <p>No parsers yet.</p>
        </EuiText>
      )}

      {rows.map((row, index) => {
        const rowPath = `${path}[${index}]`;
        const missingField =
          row.field.trim() === '' && row.expressions.some((expression) => expression.trim() !== '');

        return (
          <div key={index}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiText size={'xs'} color="subdued">
                    <strong>{`Parser ${index + 1}`}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={'Remove parser'}>
                    <EuiSmallButtonIcon
                      aria-label={`Remove parser ${index + 1}`}
                      iconType={'trash'}
                      color="danger"
                      onClick={() => remove(index)}
                      data-test-subj={`${rowPath}.delete`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />

              <EuiCompressedFormRow
                label={fieldLabel('Field')}
                helpText="The field this parser reads, for example message or event.original."
                fullWidth={true}
                isInvalid={missingField || !!errors[rowPath]}
                error={missingField ? 'A parser needs the field it reads' : errors[rowPath]}
              >
                <EuiCompressedFieldText
                  prepend="parse|"
                  placeholder="event.original"
                  value={row.field}
                  onChange={(e) => update(index, { field: e.target.value })}
                  onBlur={() => onBlurPath?.(rowPath)}
                  isInvalid={missingField}
                  data-test-subj={`${rowPath}.field`}
                />
              </EuiCompressedFormRow>

              <EuiSpacer size="m" />

              <FormFieldArray
                label={fieldLabel('Expressions')}
                helpText="Tried in order until one succeeds."
                values={row.expressions}
                placeholder="<_tmp.date/date/%y%m%d %T> <_tmp.message>"
                addButtonLabel="Add expression"
                onChange={(expressions) => update(index, { expressions })}
              />
            </EuiPanel>
          </div>
        );
      })}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={() => onChange([...rows, { field: '', expressions: [''] }])}
        data-test-subj={`${path}.add`}
      >
        Add parser
      </EuiButtonEmpty>
    </div>
  );
};
