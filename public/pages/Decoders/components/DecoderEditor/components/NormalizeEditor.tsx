/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import { NormalizeEntryModel, emptyNormalizeEntry } from '../DecoderEditorFormModel';
import { NormalizeEntryEditor } from './NormalizeEntryEditor';

export interface NormalizeEditorProps {
  entries: NormalizeEntryModel[];
  onChange: (entries: NormalizeEntryModel[]) => void;
  errors?: Record<string, string>;
}

/**
 * `normalize` — the sequential sub-stages the engine runs in order.
 *
 * Entries can be added and removed but not reordered here: no other form in the
 * plugin reorders anything, authoring is naturally append-only, and the YAML editor
 * covers the occasional correction. What the editor does guarantee is that it never
 * changes the order on its own — an entry it cannot render keeps its exact index
 * (see `mappers.isRenderableNormalizeEntry`), because a later entry's `check` can
 * test a field an earlier entry's `map` set.
 */
export const NormalizeEditor: React.FC<NormalizeEditorProps> = ({
  entries,
  onChange,
  errors = {},
}) => (
  <div data-test-subj="normalize-editor">
    {entries.length === 0 && (
      <EuiText size="s" color="subdued">
        <p>No entries yet.</p>
      </EuiText>
    )}

    {entries.map((entry, index) => (
      <div key={index}>
        {index > 0 && <EuiSpacer size="m" />}
        <NormalizeEntryEditor
          path={`normalize[${index}]`}
          index={index}
          entry={entry}
          errors={errors}
          onChange={(next) => onChange(entries.map((e, i) => (i === index ? next : e)))}
          onRemove={() => onChange(entries.filter((_, i) => i !== index))}
        />
      </div>
    ))}

    <EuiSpacer size="s" />
    <EuiButtonEmpty
      size="s"
      iconType="plusInCircle"
      onClick={() => onChange([...entries, emptyNormalizeEntry()])}
      data-test-subj="normalize.add"
    >
      Add normalize entry
    </EuiButtonEmpty>
  </div>
);
