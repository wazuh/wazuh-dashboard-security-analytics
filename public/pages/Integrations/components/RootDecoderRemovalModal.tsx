/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PolicyResourceEntry, PolicyResources } from '../../../../types';

type NormalizationResources = PolicyResources['normalization'];

const RESOURCE_GROUPS: Array<{ key: keyof NormalizationResources; label: string }> = [
  { key: 'decoders', label: 'Decoders' },
  { key: 'kvdbs', label: 'KVDBs' },
  { key: 'filters', label: 'Filters' },
];

export const hasNormalizationResources = (resources?: NormalizationResources): boolean =>
  RESOURCE_GROUPS.some(({ key }) => (resources?.[key]?.length ?? 0) > 0);

const ResourceGroup: React.FC<{ label: string; items: PolicyResourceEntry[] }> = ({
  label,
  items,
}) => (
  <EuiText size="s" data-test-subj={`rootDecoderRemovalModal-${label}`}>
    <h4>
      {label} ({items.length})
    </h4>
    <ul>
      {items.map(({ id, name }) => (
        <li key={id}>{name || id}</li>
      ))}
    </ul>
  </EuiText>
);

export interface RootDecoderRemovalModalProps {
  /** The normalization resources left in the space. Absent when they could not be listed. */
  resources?: NormalizationResources;
  /** Why the resources could not be listed. */
  error?: string;
  isClearing: boolean;
  isSaving: boolean;
  onClearNormalization: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export const RootDecoderRemovalModal: React.FC<RootDecoderRemovalModalProps> = ({
  resources,
  error,
  isClearing,
  isSaving,
  onClearNormalization,
  onSaveAnyway,
  onCancel,
}) => {
  const isBusy = isClearing || isSaving;
  const canClear = !error && hasNormalizationResources(resources);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={isBusy ? () => {} : onCancel} data-test-subj="rootDecoderRemovalModal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {error ? 'Space resources not checked' : 'Space still has normalization resources'}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {error ? (
            <EuiCallOut
              color="warning"
              iconType="alert"
              title="Failed to retrieve the space resources"
            >
              <p>{error}</p>
              <p>
                You can still save the policy without a root decoder. Promotion fails while the
                space has decoders, KVDBs or filters and no root decoder.
              </p>
            </EuiCallOut>
          ) : (
            <>
              <EuiText size="s">
                <p>
                  The policy has no root decoder, but the space still has the resources below. The
                  Engine needs a root decoder to load them, so promotion fails until you select a
                  root decoder or delete them.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {RESOURCE_GROUPS.filter(({ key }) => (resources?.[key]?.length ?? 0) > 0).map(
                  ({ key, label }) => (
                    <ResourceGroup key={key} label={label} items={resources![key]} />
                  )
                )}
              </div>
              <EuiSpacer size="m" />
              <EuiCallOut color="danger" iconType="alert" size="s" title="Clear normalization">
                <p>
                  Deletes every decoder, KVDB and filter in the space, and the integrations left
                  empty. Rules are kept. This action cannot be undone.
                </p>
              </EuiCallOut>
            </>
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} isDisabled={isBusy}>
            Cancel
          </EuiButtonEmpty>
          <EuiButton
            onClick={onSaveAnyway}
            isDisabled={isBusy}
            isLoading={isSaving}
            data-test-subj="rootDecoderRemovalModal-saveAnyway"
          >
            Save anyway
          </EuiButton>
          {canClear && (
            <EuiButton
              fill
              color="danger"
              onClick={onClearNormalization}
              isDisabled={isBusy}
              isLoading={isClearing}
              data-test-subj="rootDecoderRemovalModal-clearNormalization"
            >
              Clear normalization
            </EuiButton>
          )}
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
