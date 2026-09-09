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
  /** Renders the value as a single line instead of a growing textarea. */
  singleLineValue?: boolean;
}

/**
 * A list of `{ <field>: <value> }` pairs, laid out like the KVDB content editor so
 * the two read as the same control.
 *
 * The document holds these with the *field name as the key*, but the form holds
 * `{ field, value }` rows: Formik splits paths on dots, and ECS field names are
 * full of them, so an isomorphic model would turn `source.ip` into nesting. Schema
 * errors reported against the document key are routed back onto the row by
 * `errorRouting.nearestFormPath`.
 */
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
  singleLineValue = false,
}) => {
  const update = (index: number, patch: Partial<FieldValueRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  // An error routed to the section rather than to a row — e.g. "must have at least
  // one item", or one whose row index is out of range.
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
        // A value with no field name cannot be written to the document at all.
        // Same predicate the submit gate uses, so the two can never disagree.
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
                    style={{ height: '37px', padding: '6px 8px' }}
                    placeholder={fieldPlaceholder}
                    value={row.field}
                    onChange={(e) => update(index, { field: e.target.value })}
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
                      style={{ height: '37px', padding: '6px 8px' }}
                      placeholder={valuePlaceholder}
                      value={row.value}
                      onChange={(e) => update(index, { value: e.target.value })}
                      fullWidth
                      data-test-subj={`${rowPath}.value`}
                    />
                  ) : (
                    <EuiCompressedTextArea
                      placeholder={valuePlaceholder}
                      value={row.value}
                      onChange={(e) => update(index, { value: e.target.value })}
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
