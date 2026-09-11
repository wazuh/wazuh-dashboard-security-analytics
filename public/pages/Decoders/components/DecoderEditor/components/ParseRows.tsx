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
  EuiCompressedTextArea,
  EuiSmallButton,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { fieldLabel } from '../labels';
import { PARSE_FIELD_HELP } from '../hints';
import { ParserRow } from '../DecoderEditorFormModel';

/**
 * Shipped decoders carry expressions of two hundred characters and more, so one
 * line hides most of them. The box opens on two lines and grows with the text,
 * estimating how many lines it wraps onto at the widths this form is used at.
 */
const CHARACTERS_PER_LINE = 90;
const MIN_EXPRESSION_ROWS = 2;
const MAX_EXPRESSION_ROWS = 8;

const expressionRows = (expression: string): number =>
  Math.min(
    Math.max(Math.ceil(expression.length / CHARACTERS_PER_LINE), MIN_EXPRESSION_ROWS),
    MAX_EXPRESSION_ROWS
  );

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
            {index > 0 && <EuiSpacer size="m" />}
            <EuiPanel hasShadow={false} hasBorder data-test-subj={`${rowPath}.panel`}>
              {!missingField && errors[rowPath] && (
                <>
                  <EuiCallOut
                    size="s"
                    color="warning"
                    title={errors[rowPath]}
                    data-test-subj={`${rowPath}.error`}
                  />
                  <EuiSpacer size="s" />
                </>
              )}
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiCompressedFormRow
                    label={fieldLabel('Field')}
                    helpText={PARSE_FIELD_HELP}
                    fullWidth={true}
                    isInvalid={missingField}
                    error={missingField ? 'A parser needs the field it reads' : undefined}
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

              <EuiSpacer size="m" />

              <EuiCompressedFormRow label={fieldLabel('Expressions')} fullWidth={true}>
                <>
                  {row.expressions.map((expression, expressionIndex) => (
                    <React.Fragment key={expressionIndex}>
                      {expressionIndex > 0 && <EuiSpacer size="s" />}
                      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                        <EuiFlexItem>
                          <EuiCompressedTextArea
                            placeholder="<_tmp.date/date/%y%m%d %T> <_tmp.message>"
                            value={expression}
                            rows={expressionRows(expression)}
                            resize="vertical"
                            onChange={(e) =>
                              update(index, {
                                expressions: row.expressions.map((current, i) =>
                                  i === expressionIndex ? e.target.value : current
                                ),
                              })
                            }
                            fullWidth
                            data-test-subj={`${rowPath}.expressions[${expressionIndex}]`}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={'Remove expression'}>
                            <EuiSmallButtonIcon
                              aria-label={`Remove expression ${expressionIndex + 1}`}
                              iconType={'trash'}
                              color="danger"
                              onClick={() =>
                                update(index, {
                                  expressions: row.expressions.filter(
                                    (_, i) => i !== expressionIndex
                                  ),
                                })
                              }
                              data-test-subj={`${rowPath}.expressions[${expressionIndex}].delete`}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </React.Fragment>
                  ))}
                  {row.expressions.length > 0 && <EuiSpacer size="m" />}
                  <EuiSmallButton
                    type="button"
                    onClick={() => update(index, { expressions: [...row.expressions, ''] })}
                    data-test-subj={`${rowPath}.expressions.add`}
                  >
                    Add expression
                  </EuiSmallButton>
                </>
              </EuiCompressedFormRow>
            </EuiPanel>
          </div>
        );
      })}

      <EuiSpacer size="m" />
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
