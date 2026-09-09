/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCode,
  EuiCompressedFormRow,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { ParseRows } from '../components/ParseRows';
import { YamlSlot } from '../components/YamlSlot';
import {
  DecoderFormModel,
  NormalizeEntryModel,
  emptyNormalizeEntry,
} from '../DecoderEditorFormModel';
import {
  modelToCheck,
  modelToNormalizeEntry,
  normalizeEntryToModel,
  textToValue,
} from '../mappers';
import { GrammarVariantProps } from './GrammarVariantProps';
import YAML from 'yaml';
import { fieldLabel } from '../labels';
import { DEFINITIONS_HINT, MAP_HINT, PARSE_HINT } from '../hints';

const summarizeCheck = (entry: NormalizeEntryModel): string => {
  if (entry.raw !== undefined) return '—';
  const value = modelToCheck(entry.check);
  if (value === undefined) return 'always';
  if (typeof value === 'string') return value;
  return `${(value as unknown[]).length} condition(s)`;
};

/**
 * Keep the form short; edit one entry at a time.
 *
 * The other variants all still render every field of every entry inline, which is
 * why the page feels heavy the moment a decoder has more than two stages. Here
 * `normalize` collapses to a table of one-line summaries — the shape of the whole
 * pipeline fits on screen — and editing opens a flyout, the pattern this plugin
 * already uses everywhere for detail views.
 */
export const GrammarTableFlyoutVariant: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
}) => {
  const [editing, setEditing] = useState<number | null>(null);

  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

  const setEntry = (index: number, next: NormalizeEntryModel) =>
    set(
      'normalize',
      values.normalize.map((entry, i) => (i === index ? next : entry))
    );

  const entryYaml = (entry: NormalizeEntryModel) =>
    entry.raw !== undefined
      ? entry.raw
      : YAML.stringify(modelToNormalizeEntry(entry), { lineWidth: 0 }).trimEnd();

  const hasError = (index: number) =>
    Object.keys(fieldErrors).some((key) => key.startsWith(`normalize[${index}]`));

  const columns = [
    {
      field: 'position',
      name: '#',
      width: '48px',
      render: (_: unknown, item: NormalizeEntryModel & { index: number }) => item.index + 1,
    },
    {
      field: 'check',
      name: 'Check',
      render: (_: unknown, item: NormalizeEntryModel & { index: number }) => (
        <EuiText size="s">{summarizeCheck(item)}</EuiText>
      ),
    },
    {
      field: 'parsers',
      name: 'Parsers',
      width: '110px',
      render: (_: unknown, item: NormalizeEntryModel & { index: number }) =>
        item.parsers.length ? <EuiBadge color="hollow">{item.parsers.length}</EuiBadge> : '—',
    },
    {
      field: 'map',
      name: 'Mappings',
      width: '110px',
      render: (_: unknown, item: NormalizeEntryModel & { index: number }) =>
        item.map.length ? <EuiBadge color="hollow">{item.map.length}</EuiBadge> : '—',
    },
    {
      field: 'status',
      name: 'Status',
      width: '130px',
      render: (_: unknown, item: NormalizeEntryModel & { index: number }) => {
        if (item.raw !== undefined) return <EuiBadge color="default">YAML only</EuiBadge>;
        if (hasError(item.index)) return <EuiBadge color="warning">Check errors</EuiBadge>;
        return <EuiBadge color="success">OK</EuiBadge>;
      },
    },
    {
      name: 'Actions',
      width: '110px',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this entry',
          icon: 'pencil',
          type: 'icon' as const,
          onClick: (item: NormalizeEntryModel & { index: number }) => setEditing(item.index),
        },
        {
          name: 'Delete',
          description: 'Delete this entry',
          icon: 'trash',
          color: 'danger' as const,
          type: 'icon' as const,
          onClick: (item: NormalizeEntryModel & { index: number }) =>
            set(
              'normalize',
              values.normalize.filter((_, i) => i !== item.index)
            ),
        },
      ],
    },
  ];

  const items = values.normalize.map((entry, index) => ({ ...entry, index }));
  const entry = editing === null ? undefined : values.normalize[editing];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiCompressedFormRow label={fieldLabel('Check', true)} fullWidth={true}>
        <CheckEditor
          path="check"
          model={values.check}
          onChange={(check) => set('check', check)}
          errors={fieldErrors}
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Parsers', true)} fullWidth={true}>
        <ParseRows
          path="parsers"
          rows={values.parsers}
          onChange={(parsers) => set('parsers', parsers)}
          errors={fieldErrors}
          helpText={PARSE_HINT}
        />
      </EuiCompressedFormRow>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xxs">
        <h3>Normalize</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>Sequential sub-stages. Each one runs in order on every event that reaches it.</p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiBasicTable
        items={items}
        columns={columns as any}
        compressed
        noItemsMessage="No entries yet."
      />
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={() => {
          set('normalize', [...values.normalize, emptyNormalizeEntry()]);
          setEditing(values.normalize.length);
        }}
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
          fieldPlaceholder="_threshold"
          valuePlaceholder="5"
          addLabel="Add definition"
          emptyLabel="No definitions yet."
          helpText={DEFINITIONS_HINT}
        />
      </EuiCompressedFormRow>

      {editing !== null && entry && (
        <EuiFlyout onClose={() => setEditing(null)} size="m" ownFocus>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>{`Normalize ${editing + 1}`}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                Runs after{' '}
                <EuiCode>
                  {editing === 0 ? 'the top-level parsers' : `Normalize ${editing}`}
                </EuiCode>
                .
              </p>
            </EuiText>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <YamlSlot
              slotId={`normalize[${editing}]`}
              label={`Normalize ${editing + 1}`}
              yamlValue={entryYaml(entry)}
              error={fieldErrors[`normalize[${editing}]`]}
              onYamlChange={(text) =>
                setEntry(
                  editing,
                  text.trim() === ''
                    ? emptyNormalizeEntry()
                    : normalizeEntryToModel(textToValue(text))
                )
              }
              structuredUnavailableReason={
                entry.raw !== undefined
                  ? `Normalize ${
                      editing + 1
                    } uses fields this editor does not recognize, so it can only be edited as YAML.`
                  : undefined
              }
            >
              <>
                <EuiCompressedFormRow label={fieldLabel('Check', true)} fullWidth={true}>
                  <CheckEditor
                    path={`normalize[${editing}].check`}
                    nested
                    model={entry.check}
                    onChange={(check) => setEntry(editing, { ...entry, check })}
                    errors={fieldErrors}
                  />
                </EuiCompressedFormRow>
                <EuiSpacer size="m" />

                <EuiCompressedFormRow label={fieldLabel('Parsers', true)} fullWidth={true}>
                  <ParseRows
                    path={`normalize[${editing}].parsers`}
                    rows={entry.parsers}
                    onChange={(parsers) => setEntry(editing, { ...entry, parsers })}
                    errors={fieldErrors}
                    helpText={PARSE_HINT}
                  />
                </EuiCompressedFormRow>
                <EuiSpacer size="m" />

                <EuiCompressedFormRow label={fieldLabel('Map', true)} fullWidth={true}>
                  <MapRows
                    path={`normalize[${editing}].map`}
                    rows={entry.map}
                    onChange={(map) => setEntry(editing, { ...entry, map })}
                    errors={fieldErrors}
                    fieldPlaceholder="event.kind"
                    valuePlaceholder="event"
                    addLabel="Add mapping"
                    emptyLabel="No mappings yet."
                    helpText={MAP_HINT}
                  />
                </EuiCompressedFormRow>
              </>
            </YamlSlot>
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiSmallButton fill onClick={() => setEditing(null)}>
              Done
            </EuiSmallButton>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </EuiPanel>
  );
};
