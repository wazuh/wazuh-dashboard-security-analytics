/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFormHelpText,
  EuiCallOut,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedSwitch,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormFieldArray } from '../../../../components/FormFieldArray';
import { fieldLabel } from './labels';
import { TouchedState, emptyTouched, visibleErrors, withTouched } from './touched';
import { NAME_HINT, PARENTS_HINT } from './hints';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { MetadataFields } from './components/MetadataFields';
// PROTOTYPE — the decoder-specific block is swappable while its layout is being
// decided. Remove this, the `variant` prop and ./prototype once a winner lands.
import { resolveGrammarVariant } from './prototype';

export interface DecoderEditorFormProps {
  values: DecoderFormModel;
  onChange: (values: DecoderFormModel) => void;
  /** Schema errors already routed onto form paths by `routeSchemaErrors`. */
  fieldErrors?: Record<string, string>;
  /** Schema errors with no field to land on. */
  documentErrors?: string[];
  /** PROTOTYPE — which rendering of the decoder-specific block to show. */
  variant?: string;
  /** True once submission has been attempted; every error shows from then on. */
  submitAttempted?: boolean;
}

/**
 * The decoder visual editor.
 *
 * Laid out with the same controls, labels, spacing and field order as the KVDB
 * editor — `FormFieldHeader` inside `EuiCompressedFormRow`, `fullWidth` on the row
 * and never on the input, a single column, and an `EuiSpacer size="m"` between
 * fields — so the four forms read as one application.
 *
 * Field order follows KVDBs rather than filters: identity, the metadata block both
 * siblings already order identically, then the decoder grammar in document order.
 * Filters can afford to put `check` second because it is one small editor; a
 * decoder's `normalize` is tall enough to bury everything under it.
 *
 * See the decoder section of TERMINOLOGY.md.
 */
export const DecoderEditorForm: React.FC<DecoderEditorFormProps> = ({
  values,
  onChange,
  fieldErrors = {},
  documentErrors = [],
  variant,
  submitAttempted = false,
}) => {
  // Errors come from the JSON Schema rather than Formik's own validation, so the
  // `touched` gate the filter and KVDB forms get for free has to be applied here:
  // a form opened for the first time must be quiet, even though validation has
  // already run against the loaded document.
  const [touched, setTouched] = useState<TouchedState>(emptyTouched);
  const onBlurPath = useCallback(
    (path: string) => setTouched((current) => withTouched(current, path)),
    []
  );
  const shownErrors = visibleErrors(fieldErrors, { ...touched, submitted: submitAttempted });
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  const preservedKeys = Object.keys(values.__preserved);
  const Grammar = resolveGrammarVariant(variant).Component;

  return (
    <div data-test-subj="decoder-visual-editor">
      {documentErrors.length > 0 && (
        <>
          <EuiCallOut size="s" color="warning" title="Please address the highlighted errors.">
            <ul>
              {documentErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {preservedKeys.length > 0 && (
        <>
          <EuiCallOut
            size="s"
            color="primary"
            iconType="iInCircle"
            title={`Kept as they are, and not editable here: ${preservedKeys.join(
              ', '
            )}. Switch to the YAML editor to change them.`}
            data-test-subj="preserved-keys-callout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {values.id && (
        <>
          <EuiCompressedFormRow label={fieldLabel('ID')} fullWidth={true}>
            <EuiCompressedFieldText readOnly value={values.id} data-test-subj="id" />
          </EuiCompressedFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiCompressedFormRow
        label={fieldLabel('Name')}
        fullWidth={true}
        isInvalid={!!shownErrors.name}
        error={shownErrors.name}
        helpText={!shownErrors.name ? NAME_HINT : undefined}
      >
        <EuiCompressedFieldText
          placeholder="decoder/syslog/0"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => onBlurPath('name')}
          isInvalid={!!shownErrors.name}
          data-test-subj="name"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <MetadataFields
        metadata={values.metadata}
        onChange={(metadata) => set('metadata', metadata)}
        errors={shownErrors}
        onBlur={onBlurPath}
        afterAuthor={
          <>
            <EuiCompressedFormRow label={fieldLabel('Enabled')} fullWidth={true}>
              <EuiCompressedSwitch
                label={values.enabled ? 'Enabled' : 'Disabled'}
                checked={values.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                data-test-subj="enabled"
              />
            </EuiCompressedFormRow>
            <EuiSpacer size="m" />
          </>
        }
      />
      <EuiSpacer size="m" />

      <EuiText size={'s'}>
        <strong>Parents</strong>
        {' - '}
        <em>optional</em>
      </EuiText>
      <EuiFormHelpText>{PARENTS_HINT}</EuiFormHelpText>
      <FormFieldArray
        label=""
        values={values.parents.length ? values.parents : ['']}
        placeholder="decoder/integrations/0"
        addButtonLabel="Add parent"
        onChange={(parents) => set('parents', parents)}
      />
      <EuiSpacer size="m" />

      {/* PROTOTYPE — decoder-specific block, swappable via ?variant= */}
      <Grammar
        values={values}
        onChange={onChange}
        fieldErrors={shownErrors}
        onBlurPath={onBlurPath}
      />
    </div>
  );
};
