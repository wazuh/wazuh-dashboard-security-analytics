/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { ParseRows } from '../components/ParseRows';
import { YamlSlot } from '../components/YamlSlot';
import { DecoderFormModel, emptyNormalizeEntry } from '../DecoderEditorFormModel';
import { modelToNormalizeEntry, normalizeEntryToModel, textToValue } from '../mappers';
import { DEFINITIONS_HINT, MAP_HINT, NORMALIZE_HINT, PARSE_HINT } from '../hints';
import { GrammarVariantProps } from './GrammarVariantProps';
import YAML from 'yaml';

/**
 * Hierarchy from typography and position, not from containers.
 *
 * Every other variant nests a panel inside a panel inside a panel — variant
 * wrapper, then one per normalize entry, then one per parser. Boxes inside boxes
 * add a border and a shadow at each level while saying nothing the indentation
 * did not already say.
 *
 * Here there are no panels at all. `EuiDescribedFormGroup` — EUI's own pattern for
 * this, and the way OpenSearch Dashboards lays out its settings forms — puts each
 * section's name and purpose in a left column and its controls in a right one. The
 * left column carries the hierarchy, so the right column can stay plain, and the
 * reader can scan section names down one edge without reading any of the fields.
 *
 * Normalize entries are separated by a single rule between them, not wrapped
 * individually: a divider between two things is one line, a card around each is
 * four.
 */
export const GrammarOutlineVariant: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  const setEntry = (index: number, next: any) =>
    set(
      'normalize',
      values.normalize.map((entry, i) => (i === index ? next : entry))
    );

  const entryYaml = (entry: any) =>
    entry.raw !== undefined
      ? entry.raw
      : YAML.stringify(modelToNormalizeEntry(entry), { lineWidth: 0 }).trimEnd();

  const subLabel = (text: string) => (
    <>
      <EuiText size={'xs'}>
        <strong>{text}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
    </>
  );

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        titleSize="xxs"
        title={<h3>Check</h3>}
        description="Decides whether this decoder accepts the event at all. An event that fails it is not decoded here."
      >
        <CheckEditor
          path="check"
          model={values.check}
          onChange={(check) => set('check', check)}
          errors={fieldErrors}
        />
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        fullWidth
        titleSize="xxs"
        title={<h3>Parsers</h3>}
        description="Applied at the top level, before any normalize entry runs."
      >
        <ParseRows
          path="parsers"
          rows={values.parsers}
          onChange={(parsers) => set('parsers', parsers)}
          errors={fieldErrors}
          helpText={PARSE_HINT}
          flat
        />
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        fullWidth
        titleSize="xxs"
        title={<h3>Normalize</h3>}
        description={NORMALIZE_HINT}
      >
        <>
          {values.normalize.length === 0 && (
            <EuiText size="s" color="subdued">
              <p>No entries yet.</p>
            </EuiText>
          )}

          {values.normalize.map((entry, index) => (
            <div key={index}>
              {index > 0 && <EuiHorizontalRule margin="l" />}

              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiText size={'s'}>
                    <strong>{`Normalize ${index + 1}`}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={`Delete Normalize ${index + 1}`}>
                    <EuiSmallButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label={`Delete Normalize ${index + 1}`}
                      onClick={() =>
                        set(
                          'normalize',
                          values.normalize.filter((_, i) => i !== index)
                        )
                      }
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />

              <YamlSlot
                slotId={`normalize[${index}]`}
                label={`Normalize ${index + 1}`}
                yamlValue={entryYaml(entry)}
                error={fieldErrors[`normalize[${index}]`]}
                onYamlChange={(text) =>
                  setEntry(
                    index,
                    text.trim() === ''
                      ? emptyNormalizeEntry()
                      : normalizeEntryToModel(textToValue(text))
                  )
                }
                structuredUnavailableReason={
                  entry.raw !== undefined
                    ? `Normalize ${
                        index + 1
                      } uses fields this editor does not recognize, so it can only be edited as YAML. It is kept exactly as it is, in this position.`
                    : undefined
                }
              >
                <>
                  {subLabel('Check')}
                  <CheckEditor
                    path={`normalize[${index}].check`}
                    nested
                    model={entry.check}
                    onChange={(check) => setEntry(index, { ...entry, check })}
                    errors={fieldErrors}
                  />

                  <EuiSpacer size="m" />
                  {subLabel('Parsers')}
                  <ParseRows
                    path={`normalize[${index}].parsers`}
                    rows={entry.parsers}
                    onChange={(parsers) => setEntry(index, { ...entry, parsers })}
                    errors={fieldErrors}
                    helpText={PARSE_HINT}
                    flat
                  />

                  <EuiSpacer size="m" />
                  {subLabel('Map')}
                  <MapRows
                    path={`normalize[${index}].map`}
                    rows={entry.map}
                    onChange={(map) => setEntry(index, { ...entry, map })}
                    errors={fieldErrors}
                    fieldPlaceholder="event.kind"
                    valuePlaceholder="event"
                    addLabel="Add mapping"
                    emptyLabel="No mappings yet."
                    helpText={MAP_HINT}
                  />
                </>
              </YamlSlot>
            </div>
          ))}

          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            iconType="plusInCircle"
            onClick={() => set('normalize', [...values.normalize, emptyNormalizeEntry()])}
          >
            Add normalize entry
          </EuiButtonEmpty>
        </>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        fullWidth
        titleSize="xxs"
        title={<h3>Definitions</h3>}
        description="Constants expanded wherever they are referenced, resolved when the decoder is built rather than per event."
      >
        <MapRows
          path="definitions"
          rows={values.definitions}
          onChange={(definitions) => set('definitions', definitions)}
          errors={fieldErrors}
          fieldPlaceholder="_threshold"
          valuePlaceholder="5"
          addLabel="Add definition"
          emptyLabel="No definitions yet."
          helpText={DEFINITIONS_HINT}
        />
      </EuiDescribedFormGroup>
    </>
  );
};
