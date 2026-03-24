/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormLabel,
  EuiLink,
  EuiModalBody,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiText,
  EuiHealth,
} from '@elastic/eui';
import moment from 'moment';
import { FilterItem } from '../../../../types';
import { DEFAULT_EMPTY_DATA } from '../../../utils/constants';

interface FilterDetailsFlyoutProps {
  filter: FilterItem;
  onClose: () => void;
}

const editorType = {
  visual: 'visual',
  json: 'json',
};

/** Resolve author display: indexer sends string; legacy may send { name } */
const getAuthorDisplay = (author: string | { name?: string } | undefined): string => {
  if (!author) return '';
  if (typeof author === 'string') return author;
  return author.name ?? '';
};

const formatDate = (value?: string): string => {
  if (!value) return DEFAULT_EMPTY_DATA;
  try {
    const d = moment(value);
    return d.isValid() ? d.format('MMM DD, YYYY @ HH:mm:ss.SSS') : value;
  } catch {
    return value;
  }
};

export const FilterDetailsFlyout: React.FC<FilterDetailsFlyoutProps> = ({ filter, onClose }) => {
  const [selectedEditorType, setSelectedEditorType] = useState(editorType.visual);

  const document = filter.document ?? {
    id: '',
    name: '',
    type: '',
    check: '',
    enabled: false,
  };

  const metadata = document.metadata ?? {};
  const references = metadata.references ?? [];
  const supports = metadata.supports ?? [];

  const visualTab = (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>Name</EuiFormLabel>
          <EuiText size="s">{document.name || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>Type</EuiFormLabel>
          <EuiText size="s">{document.type || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>Description</EuiFormLabel>
          <EuiText size="s">{metadata.description || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>Author</EuiFormLabel>
          <EuiText size="s">{getAuthorDisplay(metadata.author) || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>Documentation</EuiFormLabel>
          <EuiText size="s">
            {metadata.documentation ? (
              <EuiLink href={metadata.documentation} target="_blank">
                {metadata.documentation}
              </EuiLink>
            ) : (
              DEFAULT_EMPTY_DATA
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>Supports</EuiFormLabel>
          <div>
            {supports.length > 0 ? (
              <EuiFlexGroup direction="row" wrap gutterSize="s">
                {supports.map((entry, i) => (
                  <EuiFlexItem grow={false} key={i}>
                    <EuiBadge>{entry}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : (
              <div>{DEFAULT_EMPTY_DATA}</div>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>Created</EuiFormLabel>
          <EuiText size="s">{formatDate(metadata.date)}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>Modified</EuiFormLabel>
          <EuiText size="s">{formatDate(metadata.modified)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>Space</EuiFormLabel>
          <EuiText size="s">{filter.space?.name || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>ID</EuiFormLabel>
          <EuiText size="s">{document.id || filter.id || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormLabel>SHA256</EuiFormLabel>
          <EuiText size="s" style={{ wordBreak: 'break-all' }}>
            {filter.hash?.sha256 || DEFAULT_EMPTY_DATA}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormLabel>Check</EuiFormLabel>
          <EuiText size="s">{document.check || DEFAULT_EMPTY_DATA}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>References</EuiFormLabel>
          {references.length > 0 ? (
            references.map((ref, i) => (
              <div key={i} style={{ wordBreak: 'break-all' }}>
                <EuiText size="s">
                  <EuiLink href={ref} target="_blank" data-test-subj={'filter_flyout_reference'}>
                    {ref}
                  </EuiLink>
                </EuiText>
              </div>
            ))
          ) : (
            <div>{DEFAULT_EMPTY_DATA}</div>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const jsonTab = (
    <EuiCodeBlock language={editorType.json} isCopyable={true} paddingSize="m">
      {JSON.stringify(document, null, 2)}
    </EuiCodeBlock>
  );

  return (
    <EuiFlyout onClose={onClose} hideCloseButton ownFocus size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiText size="s">
              <h2>{document.name ? `Filter details — ${document.name}` : 'Filter details'}</h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSmallButtonIcon
              aria-label="close"
              iconType="cross"
              display="empty"
              iconSize="m"
              onClick={onClose}
              data-test-subj="close-filter-details-flyout"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiModalBody>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiButtonGroup
                data-test-subj="change-editor-type"
                legend="This is editor type selector"
                options={[
                  { id: editorType.visual, label: 'Visual' },
                  { id: editorType.json, label: 'JSON' },
                ]}
                idSelected={selectedEditorType}
                onChange={(id) => setSelectedEditorType(id)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <div data-test-subj={'filter_flyout_enabled'}>
                <EuiHealth color={document.enabled !== false ? 'success' : 'subdued'}>
                  {document.enabled !== false ? 'Enabled' : 'Disabled'}
                </EuiHealth>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xl" />
          {selectedEditorType === editorType.visual ? visualTab : jsonTab}
        </EuiModalBody>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
