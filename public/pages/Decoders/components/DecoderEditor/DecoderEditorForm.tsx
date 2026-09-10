/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedSwitch,
  EuiFormHelpText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormFieldArray } from '../../../../components/FormFieldArray';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { fieldLabel } from './labels';
import { NAME_HINT, PARENTS_HINT, PARSE_HINT, DEFINITIONS_HINT } from './hints';
import { errorsUnder } from './errorRouting';
import { TouchedState, emptyTouched, visibleErrors, withTouched } from './touched';
import { MetadataFields } from './components/MetadataFields';
import { CheckEditor } from './components/CheckEditor';
import { MapRows } from './components/MapRows';
import { NormalizeYamlField } from './components/NormalizeYamlField';
import { ParseRows } from './components/ParseRows';

export interface DecoderEditorFormProps {
  values: DecoderFormModel;
  onChange: (values: DecoderFormModel) => void;
  /** Schema errors already routed onto form paths by `routeSchemaErrors`. */
  fieldErrors?: Record<string, string>;
  /** Schema errors with no field to land on. */
  documentErrors?: string[];
  /** True once submission has been attempted; every error shows from then on. */
  submitAttempted?: boolean;
}

/**
 * The decoder visual editor.
 *
 * Controls, labels, spacing and field order follow the KVDB and filter editors.
 * Field order is the KVDB spine — identity, metadata, then the decoder's own
 * fields the way an event travels, definitions last.
 *
 * `normalize` is a YAML field; see NormalizeYamlField.
 */
export const DecoderEditorForm: React.FC<DecoderEditorFormProps> = ({
  values,
  onChange,
  fieldErrors = {},
  documentErrors = [],
  submitAttempted = false,
}) => {
  // Schema errors are not Formik's, so the touched gate is applied by hand.
  const [touched, setTouched] = useState<TouchedState>(emptyTouched);
  const onBlurPath = useCallback(
    (path: string) => setTouched((current) => withTouched(current, path)),
    []
  );
  const shownErrors = visibleErrors(fieldErrors, { ...touched, submitted: submitAttempted });

  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  const preservedKeys = Object.keys(values.__preserved);

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
            label={fieldLabel('ID')}
            fullWidth={true}
            helpText="Assigned by the engine and not editable."
          >
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
          placeholder="decoder/zeek-stats/0"
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
        placeholder="decoder/core-wazuh-message/0"
        addButtonLabel="Add parent"
        onChange={(parents) => set('parents', parents)}
      />
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Check', true)} fullWidth={true}>
        <CheckEditor
          path="check"
          model={values.check}
          onChange={(check) => set('check', check)}
          errors={shownErrors}
          onBlurPath={onBlurPath}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Parsers', true)} fullWidth={true}>
        <ParseRows
          path="parsers"
          rows={values.parsers}
          onChange={(parsers) => set('parsers', parsers)}
          errors={shownErrors}
          onBlurPath={onBlurPath}
          helpText={PARSE_HINT}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <NormalizeYamlField
        entries={values.normalize}
        onChange={(normalize) => set('normalize', normalize)}
        errors={errorsUnder(shownErrors, 'normalize')}
        onBlur={() => onBlurPath('normalize')}
      />
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Definitions', true)} fullWidth={true}>
        <MapRows
          path="definitions"
          rows={values.definitions}
          onChange={(definitions) => set('definitions', definitions)}
          errors={shownErrors}
          onBlurPath={onBlurPath}
          fieldPlaceholder="_log_level"
          valuePlaceholder="{ '3': error, '4': warning }"
          addLabel="Add definition"
          emptyLabel="No definitions yet."
          helpText={DEFINITIONS_HINT}
        />
      </EuiCompressedFormRow>
    </div>
  );
};
