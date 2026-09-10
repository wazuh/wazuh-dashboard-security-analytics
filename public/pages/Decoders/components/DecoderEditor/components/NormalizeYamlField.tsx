/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import YAML from 'yaml';
import { EuiCallOut, EuiCodeEditor, EuiCompressedFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { validateYamlSyntax } from '../../../../../components/YamlForm';
import { NormalizeEntryModel } from '../DecoderEditorFormModel';
import { fieldLabel } from '../labels';
import { InfoItem, LabelWithInfo } from './LabelWithInfo';
import { mapDecoderToForm, mapFormToDecoder, textToValue } from '../mappers';

export interface NormalizeYamlFieldProps {
  entries: NormalizeEntryModel[];
  onChange: (entries: NormalizeEntryModel[]) => void;
  /** A schema error reported against `normalize` or anything inside it. */
  error?: string;
  onBlur?: () => void;
}

// Same shape as the filter form's own example block beside its check editor:
// no fill, no border, just a small gap above it.
const examplePreStyle: React.CSSProperties = { margin: '4px 0 0 0' };

const STRUCTURE_HELP = (
  <div style={{ maxWidth: '600px' }}>
    Start each entry with <code>- </code>. An entry can check a condition, parse a field, and set
    fields:
    <pre style={examplePreStyle}>{`- check: $event.code == '4624'
  parse|event.original:
    - <_tmp.date/date/%y%m%d %T> <_tmp.message>
  map:
    - user.name: $_tmp.user`}</pre>
  </div>
);

const NOT_A_LIST =
  'normalize must be a list of entries, each starting with "- ". For example: "- map:".';

/**
 * `normalize`, edited as YAML.
 *
 * Every other field on this form has real controls; this one does not, and that is
 * deliberate. A `normalize` entry combines an optional `check`, any number of
 * `parse|<field>` keys and a `map`, in five valid shapes — the one construct the
 * issue calls "too complex to model", where a form would need three levels of
 * nesting to say what six lines of YAML say plainly.
 *
 * What the field does guarantee:
 *
 * - it shows the **entries themselves**, so what is on screen is what the document
 *   holds, with no wrapper key to mentally strip;
 * - it round-trips anything it is given, including entries this plugin does not
 *   recognize — text goes back through the same mappers the rest of the form uses;
 * - text that does not parse leaves the document untouched and says why, rather
 *   than quietly discarding the entries.
 */
export const NormalizeYamlField: React.FC<NormalizeYamlFieldProps> = ({
  entries,
  onChange,
  error,
  onBlur,
}) => {
  const documentYaml = useMemo(() => {
    const document = (mapFormToDecoder({
      ...mapDecoderToForm({}),
      normalize: entries,
    }) as unknown) as Record<string, unknown>;
    const normalize = document.normalize;
    if (!Array.isArray(normalize) || normalize.length === 0) return '';
    return YAML.stringify(normalize, { lineWidth: 0 }).trimEnd();
  }, [entries]);

  const [draft, setDraft] = useState(documentYaml);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const isEditingRef = useRef(false);

  // Follow the document when it changes elsewhere (the page-level YAML editor, or a
  // reload), but never rewrite text the user is in the middle of typing.
  useEffect(() => {
    if (isEditingRef.current) return;
    setDraft(documentYaml);
  }, [documentYaml]);

  const onEditorChange = useCallback(
    (text: string) => {
      isEditingRef.current = true;
      setDraft(text);

      if (text.trim() === '') {
        setSyntaxError(null);
        isEditingRef.current = false;
        onChange([]);
        return;
      }

      const invalid = validateYamlSyntax(text);
      if (invalid) {
        setSyntaxError(invalid);
        return;
      }

      const parsed = textToValue(text);
      if (!Array.isArray(parsed)) {
        setSyntaxError(NOT_A_LIST);
        return;
      }

      setSyntaxError(null);
      isEditingRef.current = false;
      onChange(mapDecoderToForm({ normalize: parsed }).normalize);
    },
    [onChange]
  );

  const shownError = syntaxError ?? error;
  const count = entries.length;

  return (
    <>
      {shownError && (
        <>
          <EuiCallOut
            size="s"
            color="danger"
            title={shownError}
            data-test-subj="normalize-yaml-error"
          />
          <EuiSpacer size="s" />
        </>
      )}

      <EuiCompressedFormRow
        label={
          <LabelWithInfo
            label={fieldLabel('Normalize', true)}
            title="Normalize entries"
            ariaLabel="Normalize information"
          >
            <InfoItem term="check">
              Optional condition. An event that fails it skips this entry and continues to the next
              one.
            </InfoItem>
            <InfoItem term="parse|&lt;field&gt;">
              Reads one field and captures parts of it into other fields.
            </InfoItem>
            <InfoItem term="map">Assigns values to fields.</InfoItem>
            <EuiText size="xs">
              <p>
                Entries run in order, so one can use fields an earlier one set. An entry needs at
                least one parser or mapping.
              </p>
            </EuiText>
          </LabelWithInfo>
        }
        fullWidth={true}
        helpText={STRUCTURE_HELP}
      >
        <EuiCodeEditor
          mode="yaml"
          width="600px"
          height="320px"
          value={draft}
          onChange={onEditorChange}
          onBlur={onBlur}
          setOptions={{ tabSize: 2, useSoftTabs: true, showPrintMargin: false }}
          aria-label="Normalize YAML editor"
          data-test-subj="normalize-yaml"
        />
      </EuiCompressedFormRow>

      {count > 0 && (
        <EuiText size="xs" color="subdued">
          <p>{count === 1 ? '1 entry' : `${count} entries`}</p>
        </EuiText>
      )}
    </>
  );
};
