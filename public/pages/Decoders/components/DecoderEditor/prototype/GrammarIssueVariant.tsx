/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import YAML from 'yaml';
import {
  EuiCallOut,
  EuiCodeEditor,
  EuiCompressedFormRow,
  EuiFormHelpText,
  EuiSpacer,
} from '@elastic/eui';
import { fieldLabel } from '../labels';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { ParseRows } from '../components/ParseRows';
import { DecoderFormModel } from '../DecoderEditorFormModel';
import { mapDecoderToForm, mapFormToDecoder, textToValue } from '../mappers';
import { validateYamlSyntax } from '../../../../../components/YamlForm';
import { DEFINITIONS_HINT, PARSE_HINT } from '../hints';
import { GrammarVariantProps } from './GrammarVariantProps';

/**
 * The approach the issue actually proposes.
 *
 * > "a curated form for the common/core decoder fields plus a YAML fallback for
 * > anything too complex to model"
 *
 * So: `check`, the top-level parsers and `definitions` get real controls, and
 * `normalize` — the one genuinely complex construct, five `oneOf` shapes deep with
 * its own nested `check`/`parse`/`map` — is a single YAML code block. No panels, no
 * nesting, and the whole decoder-specific block fits on one screen.
 *
 * Worth judging honestly against the others, because it is a real trade: the user
 * who "doesn't know the decoder shape by heart" — the issue's own stated persona —
 * still has to hand-write the part that does the actual work. What they gain is a
 * form that never becomes a wall of controls.
 */
export const GrammarIssueVariant: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
  onBlurPath,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  // `normalize` is edited as the YAML of just that key, so the block the user sees
  // is the block the document holds — no wrapper to mentally strip.
  const normalizeYaml = React.useMemo(() => {
    const document = (mapFormToDecoder(values) as unknown) as Record<string, unknown>;
    const entries = document.normalize;
    if (!Array.isArray(entries) || entries.length === 0) return '';
    return YAML.stringify(entries, { lineWidth: 0 }).trimEnd();
  }, [values]);

  const [draft, setDraft] = React.useState(normalizeYaml);
  const [syntaxError, setSyntaxError] = React.useState<string | null>(null);
  const editingRef = React.useRef(false);

  React.useEffect(() => {
    if (editingRef.current) return;
    setDraft(normalizeYaml);
  }, [normalizeYaml]);

  const onNormalizeChange = useCallback(
    (text: string) => {
      editingRef.current = true;
      setDraft(text);

      if (text.trim() === '') {
        setSyntaxError(null);
        editingRef.current = false;
        return set('normalize', []);
      }

      const error = validateYamlSyntax(text);
      setSyntaxError(error);
      if (error) return;

      const parsed = textToValue(text);
      if (!Array.isArray(parsed)) {
        setSyntaxError('normalize must be a list of entries, each starting with "- ".');
        return;
      }
      editingRef.current = false;
      set('normalize', mapDecoderToForm({ normalize: parsed }).normalize);
    },
    [values, onChange]
  );

  return (
    <>
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
          flat
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      {(syntaxError || fieldErrors.normalize) && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            title={syntaxError ?? fieldErrors.normalize}
            data-test-subj="normalize-yaml-error"
          />
          <EuiSpacer size="s" />
        </>
      )}

      <EuiCompressedFormRow
        label={fieldLabel('Normalize', true)}
        fullWidth={true}
        helpText={
          <>
            Sequential sub-stages, edited as YAML: this is the one part of a decoder the form does
            not model, because an entry can combine a <code>check</code>, any number of{' '}
            <code>parse|&lt;field&gt;</code> keys and a <code>map</code>. Each entry starts with{' '}
            <code>- </code>, and they run in order.
          </>
        }
      >
        <EuiCodeEditor
          mode="yaml"
          width="600px"
          height="320px"
          value={draft}
          onChange={onNormalizeChange}
          onBlur={() => onBlurPath?.('normalize')}
          setOptions={{ tabSize: 2, useSoftTabs: true, showPrintMargin: false }}
          aria-label="Normalize YAML editor"
          data-test-subj="normalize-yaml"
        />
      </EuiCompressedFormRow>
      <EuiFormHelpText>
        {values.normalize.length === 1 ? '1 entry' : `${values.normalize.length} entries`}
      </EuiFormHelpText>
      <EuiSpacer size="m" />

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
    </>
  );
};
