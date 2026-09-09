/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import YAML from 'yaml';
import {
  EuiAccordion,
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

export interface NormalizeEntryEditorProps {
  /** Formik path of the entry, e.g. `normalize[0]`. */
  path: string;
  index: number;
  entry: NormalizeEntryModel;
  onChange: (entry: NormalizeEntryModel) => void;
  onRemove: () => void;
  errors?: Record<string, string>;
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
}) => {
  const onYamlChange = useCallback(
    (text: string) => {
      if (text.trim() === '') return onChange({ check: { mode: 'none' }, parsers: [], map: [] });
      onChange(normalizeEntryToModel(textToValue(text)));
    },
    [onChange]
  );

  return (
    <EuiPanel paddingSize="s" data-test-subj={`normalize-entry-${index}`}>
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

      <EuiSpacer size="s" />

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
          <EuiAccordion
            className="euiAccordionForm"
            id={`${path}.check`}
            initialIsOpen={true}
            buttonContent={<EuiText size="m">Check</EuiText>}
          >
            <EuiSpacer size="s" />
            <CheckEditor
              label="Check"
              path={`${path}.check`}
              model={entry.check}
              onChange={(check) => onChange({ ...entry, check })}
              errors={errors}
            />
            <EuiSpacer size="m" />
          </EuiAccordion>

          <EuiAccordion
            className="euiAccordionForm"
            id={`${path}.parsers`}
            initialIsOpen={true}
            buttonContent={<EuiText size="m">Parsers</EuiText>}
          >
            <EuiSpacer size="s" />
            <ParseRows
              path={`${path}.parsers`}
              rows={entry.parsers}
              onChange={(parsers) => onChange({ ...entry, parsers })}
              errors={errors}
            />
            <EuiSpacer size="m" />
          </EuiAccordion>

          <EuiAccordion
            className="euiAccordionForm"
            id={`${path}.map`}
            initialIsOpen={true}
            buttonContent={<EuiText size="m">Map</EuiText>}
          >
            <EuiSpacer size="s" />
            <MapRows
              path={`${path}.map`}
              rows={entry.map}
              onChange={(map) => onChange({ ...entry, map })}
              errors={errors}
              fieldPlaceholder="Field (e.g. event.kind)"
              valuePlaceholder="Value (text, JSON, $field or a helper)"
              addLabel="Add mapping"
              emptyLabel="No mappings. A mapping assigns a value to a field."
            />
            <EuiSpacer size="m" />
          </EuiAccordion>
        </>
      </YamlSlot>
    </EuiPanel>
  );
};
