/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiFormHelpText,
  EuiHorizontalRule,
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
  /**
   * Render each parser without its panel, for a layout that gets its hierarchy from
   * typography rather than from containers (see the `outline` prototype). Avoids a
   * card inside a card.
   */
  flat?: boolean;
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
  onBlurPath,
  flat = false,
}) => {
  const update = (index: number, patch: Partial<ParserRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const sectionError = errors[path];

  // One card per parser reads badly inside a layout that has no cards at all.
  // React 18's types no longer give React.FC an implicit `children`.
  const Shell = ({ children }: { children: React.ReactNode }) =>
    flat ? (
      <>{children}</>
    ) : (
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        {children}
      </EuiPanel>
    );

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
            {index > 0 && (flat ? <EuiHorizontalRule margin="m" /> : <EuiSpacer size="m" />)}
            <Shell>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiText size={'s'}>
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

              <EuiSpacer size="m" />

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
                  onBlur={() => onBlurPath?.(rowPath)}
                  isInvalid={missingField}
                  data-test-subj={`${rowPath}.field`}
                />
              </EuiCompressedFormRow>

              <EuiSpacer size="m" />

              <EuiFormHelpText>Tried in order until one succeeds.</EuiFormHelpText>
              <FormFieldArray
                label={fieldLabel('Expressions')}
                values={row.expressions.length ? row.expressions : ['']}
                placeholder="[<@timestamp>] <log.level>: <message>"
                addButtonLabel="Add expression"
                onChange={(expressions) => update(index, { expressions })}
              />
            </Shell>
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
