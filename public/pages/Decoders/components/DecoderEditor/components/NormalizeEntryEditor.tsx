/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import YAML from 'yaml';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { NormalizeEntryModel } from '../DecoderEditorFormModel';
import { modelToNormalizeEntry, normalizeEntryToModel, textToValue } from '../mappers';
import { CheckEditor } from './CheckEditor';
import { MapRows } from './MapRows';
import { ParseRows } from './ParseRows';
import { YamlSlot } from './YamlSlot';
import { MAP_HINT, PARSE_HINT } from '../hints';

export interface NormalizeEntryEditorProps {
  /** Formik path of the entry, e.g. `normalize[0]`. */
  path: string;
  index: number;
  entry: NormalizeEntryModel;
  onChange: (entry: NormalizeEntryModel) => void;
  onRemove: () => void;
  errors?: Record<string, string>;
  onBlurPath?: (path: string) => void;
}

const entryToYamlText = (entry: NormalizeEntryModel): string => {
  if (entry.raw !== undefined) return entry.raw;
  const value = modelToNormalizeEntry(entry);
  return YAML.stringify(value, { lineWidth: 0 }).trimEnd();
};

/**
 * One entry of `normalize`, numbered from 1 the way the rules detection editor
 * numbers its maps.
 *
 * Its three sections are plain labelled blocks rather than accordions: the
 * `euiAccordionForm` chrome puts a horizontal rule above and below every section
 * and squeezes their padding, which reads as clutter once three of them are
 * stacked inside a panel.
 *
 * The schema's `_normalizeBlock` branches are not modelled as separate cases: an
 * entry simply holds a `check`, some `parse|<field>` keys and a `map`, and which
 * branch it satisfies falls out of which of those are filled in.
 */
export const NormalizeEntryEditor: React.FC<NormalizeEntryEditorProps> = ({
  path,
  index,
  entry,
  onChange,
  onRemove,
  errors = {},
  onBlurPath,
}) => {
  const onYamlChange = useCallback(
    (text: string) => {
      if (text.trim() === '') return onChange({ check: { mode: 'none' }, parsers: [], map: [] });
      onChange(normalizeEntryToModel(textToValue(text)));
    },
    [onChange]
  );

  return (
    <EuiPanel paddingSize="m" data-test-subj={`normalize-entry-${index}`}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiText size={'s'}>
            <strong>{`Normalize ${index + 1}`}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip title={'Delete'}>
            <EuiSmallButtonIcon
              aria-label={`Delete Normalize ${index + 1}`}
              iconType={'trash'}
              color="danger"
              onClick={onRemove}
              data-test-subj={`${path}.delete`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <YamlSlot
        slotId={path}
        label={`Normalize ${index + 1}`}
        yamlValue={entryToYamlText(entry)}
        onYamlChange={onYamlChange}
        error={errors[path]}
        structuredUnavailableReason={
          entry.raw !== undefined
            ? `Normalize ${
                index + 1
              } uses fields this editor does not recognize, so it can only be edited as YAML. It is kept exactly as it is, in this position.`
            : undefined
        }
      >
        <>
          <EuiText size={'s'}>
            <strong>Check</strong>
            {' - '}
            <em>optional</em>
          </EuiText>
          <EuiSpacer size="xs" />
          <CheckEditor
            path={`${path}.check`}
            nested
            model={entry.check}
            onChange={(check) => onChange({ ...entry, check })}
            errors={errors}
            onBlurPath={onBlurPath}
          />

          <EuiSpacer size="l" />

          <EuiText size={'s'}>
            <strong>Parsers</strong>
            {' - '}
            <em>optional</em>
          </EuiText>
          <EuiSpacer size="xs" />
          <ParseRows
            path={`${path}.parsers`}
            rows={entry.parsers}
            onChange={(parsers) => onChange({ ...entry, parsers })}
            onBlurPath={onBlurPath}
            errors={errors}
            helpText={PARSE_HINT}
          />

          <EuiSpacer size="l" />

          <EuiText size={'s'}>
            <strong>Map</strong>
            {' - '}
            <em>optional</em>
          </EuiText>
          <EuiSpacer size="xs" />
          <MapRows
            path={`${path}.map`}
            rows={entry.map}
            onChange={(map) => onChange({ ...entry, map })}
            onBlurPath={onBlurPath}
            errors={errors}
            fieldPlaceholder="event.kind"
            valuePlaceholder="event"
            addLabel="Add mapping"
            emptyLabel="No mappings yet."
            helpText={MAP_HINT}
          />
        </>
      </YamlSlot>
    </EuiPanel>
  );
};
