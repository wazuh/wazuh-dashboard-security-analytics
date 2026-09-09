/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiNotificationBadge,
  EuiPanel,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { ParseRows } from '../components/ParseRows';
import { YamlSlot } from '../components/YamlSlot';
import { DecoderFormModel, emptyNormalizeEntry } from '../DecoderEditorFormModel';
import { modelToNormalizeEntry, normalizeEntryToModel, textToValue } from '../mappers';
import { GrammarVariantProps } from './GrammarVariantProps';
import YAML from 'yaml';

const countErrors = (errors: Record<string, string>, prefix: string) =>
  Object.keys(errors).filter(
    (key) => key === prefix || key.startsWith(`${prefix}[`) || key.startsWith(`${prefix}.`)
  ).length;

/**
 * One concern on screen at a time.
 *
 * The form's problem is height: `check`, the parsers, `normalize` and
 * `definitions` all stack, so nothing is ever in view together and everything
 * competes. Tabs put them side by side instead, with a count badge so nothing
 * hides — the page stops scrolling and the top-level shape becomes legible at a
 * glance.
 */
export const GrammarTabsVariant: React.FC<GrammarVariantProps> = ({
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

  const entryYaml = (index: number) => {
    const entry = values.normalize[index];
    if (entry.raw !== undefined) return entry.raw;
    return YAML.stringify(modelToNormalizeEntry(entry), { lineWidth: 0 }).trimEnd();
  };

  const badge = (count: number, prefix: string) => (
    <>
      {count > 0 && <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>}
      {countErrors(fieldErrors, prefix) > 0 && (
        <>
          {' '}
          <EuiBadge color="warning">!</EuiBadge>
        </>
      )}
    </>
  );

  const tabs = [
    {
      id: 'check',
      name: (
        <>Check {countErrors(fieldErrors, 'check') > 0 && <EuiBadge color="warning">!</EuiBadge>}</>
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>Decides whether this decoder accepts the event at all.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <CheckEditor
            path="check"
            model={values.check}
            onChange={(check) => set('check', check)}
            errors={fieldErrors}
          />
        </>
      ),
    },
    {
      id: 'parsers',
      name: <>Parsers {badge(values.parsers.length, 'parsers')}</>,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>Applied at the top level, before any normalize entry runs.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <ParseRows
            path="parsers"
            rows={values.parsers}
            onChange={(parsers) => set('parsers', parsers)}
            errors={fieldErrors}
          />
        </>
      ),
    },
    {
      id: 'normalize',
      name: <>Normalize {badge(values.normalize.length, 'normalize')}</>,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>Sequential sub-stages. Each one runs in order on every event that reaches it.</p>
          </EuiText>
          <EuiSpacer size="m" />

          {values.normalize.map((entry, index) => (
            <div key={index}>
              {index > 0 && <EuiSpacer size="s" />}
              <EuiAccordion
                className="euiAccordionForm"
                id={`tabs-normalize-${index}`}
                initialIsOpen={values.normalize.length === 1}
                buttonContent={
                  <EuiText size="s">
                    <strong>{`Normalize ${index + 1}`}</strong>{' '}
                    <span style={{ opacity: 0.7 }}>
                      {[
                        entry.check.mode !== 'none' && 'check',
                        entry.parsers.length > 0 && `${entry.parsers.length} parser(s)`,
                        entry.map.length > 0 && `${entry.map.length} mapping(s)`,
                        entry.raw !== undefined && 'YAML only',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'empty'}
                    </span>
                  </EuiText>
                }
                extraAction={
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
                }
              >
                <EuiSpacer size="m" />
                <YamlSlot
                  slotId={`normalize[${index}]`}
                  label={`Normalize ${index + 1}`}
                  yamlValue={entryYaml(index)}
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
                        } uses fields this editor does not recognize, so it can only be edited as YAML.`
                      : undefined
                  }
                >
                  <>
                    <CheckEditor
                      path={`normalize[${index}].check`}
                      model={entry.check}
                      onChange={(check) => setEntry(index, { ...entry, check })}
                      errors={fieldErrors}
                    />
                    <EuiSpacer size="m" />
                    <ParseRows
                      path={`normalize[${index}].parsers`}
                      rows={entry.parsers}
                      onChange={(parsers) => setEntry(index, { ...entry, parsers })}
                      errors={fieldErrors}
                    />
                    <EuiSpacer size="m" />
                    <MapRows
                      path={`normalize[${index}].map`}
                      rows={entry.map}
                      onChange={(map) => setEntry(index, { ...entry, map })}
                      errors={fieldErrors}
                      fieldPlaceholder="Field (e.g. event.kind)"
                      valuePlaceholder="Value (text, JSON, $field or a helper)"
                      addLabel="Add mapping"
                      emptyLabel="No mappings. A mapping assigns a value to a field."
                    />
                  </>
                </YamlSlot>
                <EuiSpacer size="m" />
              </EuiAccordion>
            </div>
          ))}

          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            iconType="plusInCircle"
            onClick={() => set('normalize', [...values.normalize, emptyNormalizeEntry()])}
          >
            Add normalize entry
          </EuiButtonEmpty>
        </>
      ),
    },
    {
      id: 'definitions',
      name: <>Definitions {badge(values.definitions.length, 'definitions')}</>,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>Build-time typed macros, expanded by interpolation.</p>
          </EuiText>
          <EuiSpacer size="m" />
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
        </>
      ),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[2]} size="s" />
    </EuiPanel>
  );
};
