/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiCompressedFormRow, EuiSpacer } from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { NormalizeEditor } from '../components/NormalizeEditor';
import { ParseRows } from '../components/ParseRows';
import { fieldLabel } from '../labels';
import { DecoderFormModel } from '../DecoderEditorFormModel';
import { GrammarVariantProps } from './GrammarVariantProps';
import { DEFINITIONS_HINT, PARSE_HINT } from '../hints';

/** What is on 5.0.0 today — the thing the other variants are judged against. */
export const GrammarBaseline: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
  onBlurPath,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <>
      <EuiCompressedFormRow label={fieldLabel('Definitions', true)} fullWidth={true}>
        <MapRows
          path="definitions"
          rows={values.definitions}
          onChange={(definitions) => set('definitions', definitions)}
          errors={fieldErrors}
          onBlurPath={onBlurPath}
          fieldPlaceholder="_threshold"
          valuePlaceholder="5"
          addLabel="Add definition"
          emptyLabel="No definitions yet."
          helpText={DEFINITIONS_HINT}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Check', true)} fullWidth={true}>
        <CheckEditor
          path="check"
          model={values.check}
          onChange={(check) => set('check', check)}
          errors={fieldErrors}
          onBlurPath={onBlurPath}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Parsers', true)} fullWidth={true}>
        <ParseRows
          path="parsers"
          rows={values.parsers}
          onChange={(parsers) => set('parsers', parsers)}
          errors={fieldErrors}
          onBlurPath={onBlurPath}
          helpText={PARSE_HINT}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Normalize', true)} fullWidth={true}>
        <NormalizeEditor
          entries={values.normalize}
          onChange={(normalize) => set('normalize', normalize)}
          errors={fieldErrors}
          onBlurPath={onBlurPath}
        />
      </EuiCompressedFormRow>
    </>
  );
};
