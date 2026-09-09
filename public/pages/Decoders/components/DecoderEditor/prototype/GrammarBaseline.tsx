/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiCompressedFormRow, EuiSpacer } from '@elastic/eui';
import FormFieldHeader from '../../../../../components/FormFieldHeader';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { NormalizeEditor } from '../components/NormalizeEditor';
import { ParseRows } from '../components/ParseRows';
import { DecoderFormModel } from '../DecoderEditorFormModel';
import { GrammarVariantProps } from './GrammarVariantProps';

/** What is on 5.0.0 today — the thing the other variants are judged against. */
export const GrammarBaseline: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <>
      <EuiCompressedFormRow
        label={
          <FormFieldHeader
            headerTitle={'Definitions'}
            optionalField={true}
            toolTipText="Build-time typed macros, expanded by interpolation."
          />
        }
        fullWidth={true}
      >
        <MapRows
          path="definitions"
          rows={values.definitions}
          onChange={(definitions) => set('definitions', definitions)}
          errors={fieldErrors}
          fieldPlaceholder="Name (e.g. _threshold)"
          valuePlaceholder="Value (text or JSON)"
          addLabel="Add definition"
          emptyLabel="No definitions."
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow
        label={
          <FormFieldHeader
            headerTitle={'Check'}
            optionalField={true}
            toolTipText="Decides whether this decoder accepts the event at all."
          />
        }
        fullWidth={true}
      >
        <CheckEditor
          path="check"
          model={values.check}
          onChange={(check) => set('check', check)}
          errors={fieldErrors}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow
        label={
          <FormFieldHeader
            headerTitle={'Parsers'}
            optionalField={true}
            toolTipText="Parsers applied at the top level, before normalize runs."
          />
        }
        fullWidth={true}
      >
        <ParseRows
          path="parsers"
          rows={values.parsers}
          onChange={(parsers) => set('parsers', parsers)}
          errors={fieldErrors}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow
        label={
          <FormFieldHeader
            headerTitle={'Normalize'}
            optionalField={true}
            toolTipText="Sequential sub-stages, each run in order."
          />
        }
        fullWidth={true}
      >
        <NormalizeEditor
          entries={values.normalize}
          onChange={(normalize) => set('normalize', normalize)}
          errors={fieldErrors}
        />
      </EuiCompressedFormRow>
    </>
  );
};
