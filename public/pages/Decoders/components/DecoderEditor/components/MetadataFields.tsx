/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiCompressedTextArea,
  EuiSpacer,
} from '@elastic/eui';
import { FormFieldArray } from '../../../../../components/FormFieldArray';
import { DecoderMetadataModel } from '../DecoderEditorFormModel';
import { fieldLabel } from '../labels';

export interface MetadataFieldsProps {
  metadata: DecoderMetadataModel;
  onChange: (metadata: DecoderMetadataModel) => void;
  onBlur?: (path: string) => void;
  errors?: Record<string, string>;
  /**
   * Rendered between `Author` and `Description`. The KVDB form puts the Enabled
   * switch there, and the decoder form follows it — but `enabled` is not metadata,
   * so it is injected rather than owned here.
   */
  afterAuthor?: React.ReactNode;
}

/**
 * `metadata`.
 *
 * Labels match the KVDB and filter editors word for word, so the same field is
 * called the same thing wherever it appears. See the decoder section of
 * TERMINOLOGY.md.
 *
 * `date` and `modified` are engine-owned: carried through a round trip by the
 * mappers, and deliberately not editable here.
 */
export const MetadataFields: React.FC<MetadataFieldsProps> = ({
  metadata,
  onChange,
  onBlur,
  errors = {},
  afterAuthor,
}) => {
  const set = <K extends keyof DecoderMetadataModel>(key: K, value: DecoderMetadataModel[K]) =>
    onChange({ ...metadata, [key]: value });

  return (
    <>
      <EuiCompressedFormRow
        label={fieldLabel('Title')}
        fullWidth={true}
        isInvalid={!!errors['metadata.title']}
        error={errors['metadata.title']}
      >
        <EuiCompressedFieldText
          placeholder="Zeek STATS logs decoder"
          value={metadata.title}
          onChange={(e) => set('title', e.target.value)}
          onBlur={() => onBlur?.('metadata.title')}
          isInvalid={!!errors['metadata.title']}
          data-test-subj="metadata.title"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow
        label={fieldLabel('Author')}
        fullWidth={true}
        isInvalid={!!errors['metadata.author']}
        error={errors['metadata.author']}
      >
        <EuiCompressedFieldText
          placeholder="Wazuh, Inc."
          value={metadata.author}
          onChange={(e) => set('author', e.target.value)}
          onBlur={() => onBlur?.('metadata.author')}
          isInvalid={!!errors['metadata.author']}
          data-test-subj="metadata.author"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      {afterAuthor}

      <EuiCompressedFormRow
        label={fieldLabel('Description')}
        fullWidth={true}
        isInvalid={!!errors['metadata.description']}
        error={errors['metadata.description']}
      >
        <EuiCompressedTextArea
          placeholder="Zeek decoder for Zeek STATS logs."
          value={metadata.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => onBlur?.('metadata.description')}
          isInvalid={!!errors['metadata.description']}
          data-test-subj="metadata.description"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <EuiCompressedFormRow label={fieldLabel('Documentation', true)} fullWidth={true}>
        <EuiCompressedTextArea
          placeholder="https://docs.zeek.org/en/master/logs/stats.html"
          value={metadata.documentation}
          onChange={(e) => set('documentation', e.target.value)}
          data-test-subj="metadata.documentation"
        />
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />

      <FormFieldArray
        label={fieldLabel('References', true)}
        values={metadata.references.length ? metadata.references : ['']}
        placeholder="https://docs.zeek.org/en/master/logs/index.html"
        addButtonLabel="Add reference"
        onChange={(references) => set('references', references)}
      />

      <FormFieldArray
        label={fieldLabel('Supports', true)}
        values={metadata.supports.length ? metadata.supports : ['']}
        addButtonLabel="Add support"
        onChange={(supports) => set('supports', supports)}
      />

      <FormFieldArray
        label={fieldLabel('Compatibility', true)}
        values={metadata.compatibility.length ? metadata.compatibility : ['']}
        addButtonLabel="Add compatibility"
        onChange={(compatibility) => set('compatibility', compatibility)}
      />
    </>
  );
};
