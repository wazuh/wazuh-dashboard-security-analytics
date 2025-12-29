/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { KVDBItem } from '../../../../types';
import { DEFAULT_EMPTY_DATA } from '../../../utils/constants';
import { DescriptionGroup } from '../../../components/Utility/DescriptionGroup';
import { AssetViewer } from './AssetViewer';

interface KVDBDetailsFlyoutProps {
  kvdb: KVDBItem;
  onClose: () => void;
}

const renderBoolean = (value?: boolean) => {
  if (value === undefined || value === null) {
    return DEFAULT_EMPTY_DATA;
  }

  return value ? 'Yes' : 'No';
};

const formatPrimitive = (value: any): string => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_EMPTY_DATA;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return `${value}`;
  }

  if (typeof value === 'boolean') {
    return renderBoolean(value);
  }

  if (Array.isArray(value)) {
    const parts = value.map((entry) => formatPrimitive(entry)).filter((entry) => entry);
    return parts.length ? parts.join(', ') : DEFAULT_EMPTY_DATA;
  }

  if (typeof value === 'object') {
    if (value.name) {
      return value.name;
    }
    if (value.title) {
      return value.title;
    }
    if (value.url) {
      return value.url;
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      return DEFAULT_EMPTY_DATA;
    }
  }

  return DEFAULT_EMPTY_DATA;
};

const renderUrl = (value?: string | { url?: string; name?: string }) => {
  if (!value) {
    return DEFAULT_EMPTY_DATA;
  }

  if (typeof value === 'string') {
    return (
      <EuiLink href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </EuiLink>
    );
  }

  const href = value.url;
  if (!href) {
    return formatPrimitive(value);
  }

  const label = value.name || href;
  return (
    <EuiLink href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </EuiLink>
  );
};

const renderReferences = (value?: any) => {
  if (!value || (Array.isArray(value) && !value.length)) {
    return DEFAULT_EMPTY_DATA;
  }

  const refs = Array.isArray(value) ? value : [value];

  return (
    <>
      {refs.map((ref, index) => {
        if (typeof ref === 'string') {
          return (
            <div key={`${ref}-${index}`}>
              <EuiLink href={ref} target="_blank" rel="noopener noreferrer">
                {ref}
              </EuiLink>
            </div>
          );
        }

        if (ref && typeof ref === 'object' && ref.url) {
          const label = ref.name || ref.url;
          return (
            <div key={`${ref.url}-${index}`}>
              <EuiLink href={ref.url} target="_blank" rel="noopener noreferrer">
                {label}
              </EuiLink>
            </div>
          );
        }

        return <div key={`${index}`}>{formatPrimitive(ref)}</div>;
      })}
    </>
  );
};

export const KVDBDetailsFlyout: React.FC<KVDBDetailsFlyoutProps> = ({ kvdb, onClose }) => {
  const integrationTitle = kvdb.integration?.title ?? DEFAULT_EMPTY_DATA;
  const document = kvdb.document ?? { id: '' };

  const detailsTab = (
    <>
      <EuiSpacer />
      <DescriptionGroup
        listItems={[
          { title: 'ID', description: formatPrimitive(document.id || kvdb.id) },
          { title: 'Title', description: formatPrimitive(document.title) },
          { title: 'Integration', description: formatPrimitive(integrationTitle) },
          { title: 'Space', description: formatPrimitive(kvdb.space) },
        ]}
      />
      <EuiSpacer size="l" />
      <DescriptionGroup
        listItems={[
          { title: 'Author', description: formatPrimitive(document.author) },
          { title: 'Enabled', description: renderBoolean(document.enabled) },
          { title: 'Date', description: formatPrimitive(document.date) },
          { title: 'References', description: renderReferences(document.references) },
        ]}
      />
      <EuiSpacer size="l" />
      <DescriptionGroup
        listItems={[
          {
            title: 'URL',
            description: renderUrl(document.metadata?.author?.url),
          },
        ]}
      />
      {document.content && (
        <>
          <EuiSpacer size="l" />
          <EuiAccordion id="kvdb-content" buttonContent="Content" paddingSize="s" initialIsOpen>
            <AssetViewer content={document.content} />
          </EuiAccordion>
        </>
      )}
    </>
  );

  const jsonTab = (
    <EuiCodeBlock language="json" isCopyable={true} paddingSize="m">
      {JSON.stringify(kvdb, null, 2)}
    </EuiCodeBlock>
  );

  return (
    <EuiFlyout onClose={onClose} ownFocus size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{document.title ? `KVDB details - ${document.title}` : 'KVDB details'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent
          tabs={[
            {
              id: 'details',
              name: 'Details',
              content: detailsTab,
            },
            {
              id: 'json',
              name: 'JSON',
              content: jsonTab,
            },
          ]}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
