/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCompressedFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { ParseRows } from '../components/ParseRows';
import { YamlSlot } from '../components/YamlSlot';
import { fieldLabel } from '../labels';
import { DecoderFormModel, emptyNormalizeEntry } from '../DecoderEditorFormModel';
import { modelToNormalizeEntry, normalizeEntryToModel, textToValue } from '../mappers';
import { GrammarVariantProps } from './GrammarVariantProps';
import YAML from 'yaml';
import { DEFINITIONS_HINT, MAP_HINT, PARSE_HINT } from '../hints';

/**
 * The sequence *is* the layout.
 *
 * A decoder is a pipeline, so it is drawn as one: `EuiSteps` numbers the stages
 * itself, which removes the panel-per-entry, the repeated "Normalize N" headings
 * and the accordion inside each one. Three levels of nesting collapse to one.
 *
 * `check` and the top-level parsers become steps too, so the whole grammar reads
 * top to bottom as "accept the event, then parse it, then map it".
 */
export const GrammarStepsVariant: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
  onBlurPath,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  const entryYaml = (index: number) => {
    const entry = values.normalize[index];
    if (entry.raw !== undefined) return entry.raw;
    return YAML.stringify(modelToNormalizeEntry(entry), { lineWidth: 0 }).trimEnd();
  };

  const setEntry = (index: number, next: any) =>
    set(
      'normalize',
      values.normalize.map((entry, i) => (i === index ? next : entry))
    );

  const normalizeSteps = values.normalize.map((entry, index) => ({
    title: `Normalize ${index + 1}`,
    children: (
      <>
        <YamlSlot
          slotId={`normalize[${index}]`}
          label={`Normalize ${index + 1}`}
          yamlValue={entryYaml(index)}
          error={fieldErrors[`normalize[${index}]`]}
          onYamlChange={(text) =>
            setEntry(
              index,
              text.trim() === '' ? emptyNormalizeEntry() : normalizeEntryToModel(textToValue(text))
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
            <EuiCompressedFormRow label={fieldLabel('Check', true)} fullWidth={true}>
              <CheckEditor
                path={`normalize[${index}].check`}
                nested
                model={entry.check}
                onChange={(check) => setEntry(index, { ...entry, check })}
                errors={fieldErrors}
                onBlurPath={onBlurPath}
              />
            </EuiCompressedFormRow>
            <EuiSpacer size="m" />

            <EuiCompressedFormRow label={fieldLabel('Parsers', true)} fullWidth={true}>
              <ParseRows
                path={`normalize[${index}].parsers`}
                rows={entry.parsers}
                onChange={(parsers) => setEntry(index, { ...entry, parsers })}
                errors={fieldErrors}
                onBlurPath={onBlurPath}
                helpText={PARSE_HINT}
              />
            </EuiCompressedFormRow>
            <EuiSpacer size="m" />

            <EuiCompressedFormRow label={fieldLabel('Map', true)} fullWidth={true}>
              <MapRows
                path={`normalize[${index}].map`}
                rows={entry.map}
                onChange={(map) => setEntry(index, { ...entry, map })}
                errors={fieldErrors}
                onBlurPath={onBlurPath}
                fieldPlaceholder="event.kind"
                valuePlaceholder="event"
                addLabel="Add mapping"
                emptyLabel="No mappings yet."
                helpText={MAP_HINT}
              />
            </EuiCompressedFormRow>
          </>
        </YamlSlot>

        <EuiSpacer size="s" />
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
      </>
    ),
  }));

  const steps = [
    {
      title: 'Accept the event',
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>Decides whether this decoder handles the event at all.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <CheckEditor
            path="check"
            model={values.check}
            onChange={(check) => set('check', check)}
            errors={fieldErrors}
            onBlurPath={onBlurPath}
          />
        </>
      ),
    },
    {
      title: 'Parse the raw fields',
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>Applied before any normalize stage runs.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <ParseRows
            path="parsers"
            rows={values.parsers}
            onChange={(parsers) => set('parsers', parsers)}
            errors={fieldErrors}
            onBlurPath={onBlurPath}
            helpText={PARSE_HINT}
          />
        </>
      ),
    },
    ...normalizeSteps,
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiSteps titleSize="xs" steps={steps} />

      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={() => set('normalize', [...values.normalize, emptyNormalizeEntry()])}
      >
        Add normalize entry
      </EuiButtonEmpty>

      <EuiHorizontalRule margin="l" />

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
    </EuiPanel>
  );
};
