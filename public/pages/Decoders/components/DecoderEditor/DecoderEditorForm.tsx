/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedSwitch,
  EuiSpacer,
} from '@elastic/eui';
import FormFieldHeader from '../../../../components/FormFieldHeader';
import { FormFieldArray } from '../../../../components/FormFieldArray';
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
}) => {
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
          <EuiCompressedFormRow
            label={
              <FormFieldHeader
                headerTitle={'ID'}
                toolTipText="Assigned by the engine and not editable."
              />
            }
            fullWidth={true}
          >
            <EuiCompressedFieldText readOnly value={values.id} data-test-subj="id" />
          </EuiCompressedFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiCompressedFormRow
        label={<FormFieldHeader headerTitle={'Name'} />}
        fullWidth={true}
        isInvalid={!!fieldErrors.name}
        error={fieldErrors.name}
        helpText={
          !fieldErrors.name
            ? 'Must follow the pattern decoder/<name>/<version> (e.g. decoder/syslog/0)'
            : undefined
        }
      >
        <EuiCompressedFieldText
          placeholder="decoder/syslog/0"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          isInvalid={!!fieldErrors.name}
          data-test-subj="name"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <MetadataFields
        metadata={values.metadata}
        onChange={(metadata) => set('metadata', metadata)}
        errors={fieldErrors}
        afterAuthor={
          <>
            <EuiCompressedFormRow
              label={<FormFieldHeader headerTitle={'Enabled'} />}
              fullWidth={true}
            >
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

      <FormFieldArray
        label={
          <FormFieldHeader
            headerTitle={'Parents'}
            optionalField={true}
            toolTipText="Parent decoders evaluated before this one."
          />
        }
        values={values.parents.length ? values.parents : ['']}
        placeholder="decoder/integrations/0"
        addButtonLabel="Add parent"
        onChange={(parents) => set('parents', parents)}
      />

      {/* PROTOTYPE — decoder-specific block, swappable via ?variant= */}
      <Grammar values={values} onChange={onChange} fieldErrors={fieldErrors} />
    </div>
  );
};
