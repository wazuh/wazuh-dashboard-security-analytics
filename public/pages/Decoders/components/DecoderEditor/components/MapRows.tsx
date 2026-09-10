/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiFormHelpText,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCompressedFieldText,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FieldValueRow } from '../DecoderEditorFormModel';
import { rowNeedsField } from '../structuralValidation';

export interface MapRowsProps {
  /** Formik path of the array, e.g. `normalize[0].map`. Also the error key. */
  path: string;
  rows: FieldValueRow[];
  onChange: (rows: FieldValueRow[]) => void;
  /** Errors keyed by the Formik path of a row, from `routeSchemaErrors`. */
  errors?: Record<string, string>;
  addLabel: string;
  emptyLabel: string;
  fieldPlaceholder: string;
  valuePlaceholder: string;
  /** Shown once under the list — say what a row is for and show a real example. */
  helpText?: React.ReactNode;
  /** Called with a row's path when the user leaves it, to gate its error. */
  onBlurPath?: (path: string) => void;
  /** Renders the value as a single line instead of a growing textarea. */
  singleLineValue?: boolean;
}

/** `{ <field>: <value> }` pairs, laid out like the KVDB content editor. */
export const MapRows: React.FC<MapRowsProps> = ({
  path,
  rows,
  onChange,
  errors = {},
  addLabel,
  emptyLabel,
  fieldPlaceholder,
  valuePlaceholder,
  helpText,
  onBlurPath,
  singleLineValue = false,
}) => {
  const update = (index: number, patch: Partial<FieldValueRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  // Routed to the section, not a row.
  const sectionError = errors[path];

  return (
    <div data-test-subj={`map-rows-${path}`}>
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
          <p>{emptyLabel}</p>
        </EuiText>
      )}

      {rows.map((row, index) => {
        const rowPath = `${path}[${index}]`;
        const rowError = errors[rowPath];
        // Same predicate the submit gate uses.
        const missingField = rowNeedsField(row);
        const textareaRows = Math.min(Math.max(row.value.split('\n').length, 1), 8);

        return (
          <div key={index}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={3}>
                <EuiCompressedFormRow
                  isInvalid={missingField || !!rowError}
                  error={missingField ? 'A value needs a field to go in' : rowError}
                  fullWidth
                >
                  <EuiCompressedFieldText
                    placeholder={fieldPlaceholder}
                    value={row.field}
                    onChange={(e) => update(index, { field: e.target.value })}
                    onBlur={() => onBlurPath?.(rowPath)}
                    isInvalid={missingField}
                    fullWidth
                    data-test-subj={`${rowPath}.field`}
                  />
                </EuiCompressedFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={6}>
                <EuiCompressedFormRow fullWidth>
                  {singleLineValue ? (
                    <EuiCompressedFieldText
                      placeholder={valuePlaceholder}
                      value={row.value}
                      onChange={(e) => update(index, { value: e.target.value })}
                      onBlur={() => onBlurPath?.(rowPath)}
                      fullWidth
                      data-test-subj={`${rowPath}.value`}
                    />
                  ) : (
                    <EuiCompressedTextArea
                      placeholder={valuePlaceholder}
                      value={row.value}
                      onChange={(e) => update(index, { value: e.target.value })}
                      onBlur={() => onBlurPath?.(rowPath)}
                      rows={textareaRows}
                      fullWidth
                      data-test-subj={`${rowPath}.value`}
                    />
                  )}
                </EuiCompressedFormRow>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiCompressedFormRow>
                  <EuiToolTip content="Remove entry">
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label="Remove entry"
                      onClick={() => remove(index)}
                      data-test-subj={`${rowPath}.delete`}
                    />
                  </EuiToolTip>
                </EuiCompressedFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={() => onChange([...rows, { field: '', value: '' }])}
        data-test-subj={`${path}.add`}
      >
        {addLabel}
      </EuiButtonEmpty>
    </div>
  );
};
