/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiAccordion,
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
}

/**
 * The `parse|<field>` keys of a normalize entry (or of the document root), laid out
 * with the accordion-per-item pattern the rules detection editor uses.
 *
 * In the document these are keys whose *name* carries the target field —
 * `parse|message: [<~>]`. The form splits that into `{ field, expressions }` for
 * the same reason `map` becomes rows: a target like `parse|event.original` would
 * otherwise be read by Formik as nesting.
 */
export const ParseRows: React.FC<ParseRowsProps> = ({
  path,
  rows,
  onChange,
  errors = {},
  helpText,
}) => {
  const update = (index: number, patch: Partial<ParserRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const sectionError = errors[path];

  return (
    <div data-test-subj={`parse-rows-${path}`}>
      {helpText && (
        <>
          <EuiText size="xs" color="subdued">
            {helpText}
          </EuiText>
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
          <p>No parsers. A parser reads a field and extracts values from it.</p>
        </EuiText>
      )}

      {rows.map((row, index) => {
        const rowPath = `${path}[${index}]`;
        const missingField =
          row.field.trim() === '' && row.expressions.some((expression) => expression.trim() !== '');

        return (
          <div key={index}>
            {index > 0 && <EuiSpacer size="m" />}
            <EuiAccordion
              className="euiAccordionForm"
              id={rowPath}
              data-test-subj={rowPath}
              initialIsOpen={true}
              buttonContent={<EuiText size="m">{`Parser ${index + 1}`}</EuiText>}
              extraAction={
                <EuiToolTip title={'Delete parser'}>
                  <EuiSmallButtonIcon
                    aria-label={'Delete parser'}
                    iconType={'trash'}
                    color="danger"
                    onClick={() => remove(index)}
                    data-test-subj={`${rowPath}.delete`}
                  />
                </EuiToolTip>
              }
            >
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
                  placeholder="message"
                  value={row.field}
                  onChange={(e) => update(index, { field: e.target.value })}
                  isInvalid={missingField}
                  data-test-subj={`${rowPath}.field`}
                />
              </EuiCompressedFormRow>
              <EuiSpacer size="m" />

              <EuiText size="xs" color="subdued">
                <p style={{ marginBottom: 4 }}>Tried in order until one succeeds.</p>
              </EuiText>
              <FormFieldArray
                label={fieldLabel('Expressions')}
                values={row.expressions.length ? row.expressions : ['']}
                placeholder="<~timestamp/RFC3339> <~host> <~message>"
                addButtonLabel="Add expression"
                onChange={(expressions) => update(index, { expressions })}
              />
              <EuiSpacer size="m" />
            </EuiAccordion>
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
