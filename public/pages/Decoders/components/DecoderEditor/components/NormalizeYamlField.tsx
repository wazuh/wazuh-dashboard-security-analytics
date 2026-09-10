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
  /**
   * Schema errors for `normalize` or anything inside it. They keep their paths —
   * `normalize[2].map` is how the user finds the entry in the YAML.
   */
  errors?: string[];
  onBlur?: () => void;
}

// Matches the filter form's example block: no fill, no border.
const examplePreStyle: React.CSSProperties = { margin: '4px 0 0 0' };

const STRUCTURE_HELP = (
  <div style={{ maxWidth: '600px' }}>
    Each entry can check a condition, parse a field, and set fields:
    <pre style={examplePreStyle}>{`- check: $event.code == '4624'
  parse|event.original:
    - <_tmp.date/date/%y%m%d %T> <_tmp.message>
  map:
    - user.name: $_tmp.user`}</pre>
  </div>
);

const NOT_A_LIST = 'Normalize must be a list. Start each entry with a dash and a space.';

/**
 * `normalize`, edited as YAML — the one construct the issue calls too complex to
 * model, at five `oneOf` shapes with its own nested check/parse/map.
 *
 * It shows the entries themselves, round-trips anything it is given through the
 * same mappers as the rest of the form, and leaves the document alone when the
 * text does not parse.
 */
export const NormalizeYamlField: React.FC<NormalizeYamlFieldProps> = ({
  entries,
  onChange,
  errors = [],
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

  // Follow the document, but never while the user is typing.
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

  // Schema errors describe the last version that parsed, so hide them meanwhile.
  const shown = syntaxError ? [syntaxError] : errors;
  const count = entries.length;

  return (
    <>
      {shown.length > 0 && (
        <>
          <EuiCallOut
            size="s"
            color={syntaxError ? 'danger' : 'warning'}
            title={shown.length === 1 ? shown[0] : 'Please address the highlighted errors.'}
            data-test-subj="normalize-yaml-error"
          >
            {shown.length > 1 && (
              <ul>
                {shown.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </EuiCallOut>
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
