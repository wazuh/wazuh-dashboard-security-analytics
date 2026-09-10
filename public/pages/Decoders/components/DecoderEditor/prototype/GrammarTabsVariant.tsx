/*
 * PROTOTYPE — throwaway. See ./README.md
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiBadge,
  EuiPanel,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import { CheckEditor } from '../components/CheckEditor';
import { MapRows } from '../components/MapRows';
import { NormalizeEditor } from '../components/NormalizeEditor';
import { ParseRows } from '../components/ParseRows';
import { DecoderFormModel } from '../DecoderEditorFormModel';
import { GrammarVariantProps } from './GrammarVariantProps';
import { DEFINITIONS_HINT, PARSE_HINT } from '../hints';

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
 *
 * Inside the normalize tab the entries are the shared panels, not accordions.
 *
 * Opens on Check rather than Normalize: Check decides whether the decoder runs at
 * all, so it is the first thing an event meets and the first thing a reader should.
 */
export const GrammarTabsVariant: React.FC<GrammarVariantProps> = ({
  values,
  onChange,
  fieldErrors,
  onBlurPath,
}) => {
  const set = <K extends keyof DecoderFormModel>(key: K, value: DecoderFormModel[K]) =>
    onChange({ ...values, [key]: value });

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
            onBlurPath={onBlurPath}
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
            onBlurPath={onBlurPath}
            helpText={PARSE_HINT}
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

          <NormalizeEditor
            entries={values.normalize}
            onChange={(normalize) => set('normalize', normalize)}
            errors={fieldErrors}
            onBlurPath={onBlurPath}
          />
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
            onBlurPath={onBlurPath}
            fieldPlaceholder="_threshold"
            valuePlaceholder="5"
            addLabel="Add definition"
            emptyLabel="No definitions yet."
            helpText={DEFINITIONS_HINT}
          />
        </>
      ),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />
    </EuiPanel>
  );
};
