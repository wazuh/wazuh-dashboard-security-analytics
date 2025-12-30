/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingContent,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { DecoderItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { ContentPanel } from '../../../components/ContentPanel';
import { createTextDetailsGroup } from '../../../utils/helpers';

interface DecoderDetailsFlyoutProps {
  decoderId: string;
  space?: string;
  onClose: () => void;
}

export const DecoderDetailsFlyout: React.FC<DecoderDetailsFlyoutProps> = ({
  decoderId,
  space,
  onClose,
}) => {
  const [decoder, setDecoder] = useState<DecoderItem | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const formatTextValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const formatted = value
        .map((entry) => {
          if (entry === null || entry === undefined) {
            return '';
          }
          if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
            return String(entry);
          }
          if (typeof entry === 'object' && 'name' in entry && typeof entry.name === 'string') {
            return entry.name;
          }
          return JSON.stringify(entry);
        })
        .filter(Boolean)
        .join(', ');
      return formatted || undefined;
    }
    if (typeof value === 'object') {
      if ('name' in value && typeof value.name === 'string') {
        return value.name;
      }
      if ('value' in value && typeof value.value === 'string') {
        return value.value;
      }
      return JSON.stringify(value);
    }
    return undefined;
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);
    setDecoder(undefined);
    DataStore.decoders
      .getDecoder(decoderId, space)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        if (!response) {
          setError('Decoder not found.');
        } else {
          setDecoder(response);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message ?? 'Failed to load decoder.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [decoderId, space]);

  const decoderJson = useMemo(() => {
    if (!decoder) {
      return '';
    }
    try {
      return JSON.stringify(decoder, null, 2);
    } catch (err) {
      return '';
    }
  }, [decoder]);

  const integrations = decoder?.integrations?.length ? decoder.integrations.join(', ') : undefined;

  const detailsContent = (
    <>
      <ContentPanel title="Details" hideHeaderBorder>
        {createTextDetailsGroup([
          { label: 'Name', content: formatTextValue(decoder?.document?.name) },
          { label: 'ID', content: formatTextValue(decoder?.document?.id) },
          { label: 'Integration', content: integrations },
          { label: 'Title', content: formatTextValue(decoder?.document?.metadata?.title) },
          { label: 'Module', content: formatTextValue(decoder?.document?.metadata?.module) },
          { label: 'Compatibility', content: formatTextValue(decoder?.document?.metadata?.compatibility) },
          { label: 'Versions', content: formatTextValue(decoder?.document?.metadata?.versions) },
          { label: 'Space', content: formatTextValue(decoder?.space) },
        ])}
      </ContentPanel>

      {decoder?.document?.metadata?.author && (
        <>
          <EuiSpacer size="m" />
          <ContentPanel title="Author" hideHeaderBorder>
            {createTextDetailsGroup([
              {
                label: 'Name',
                content: formatTextValue(decoder.document.metadata.author.name),
              },
              {
                label: 'Email',
                content: formatTextValue(decoder.document.metadata.author.email),
              },
              {
                label: 'URL',
                content: formatTextValue(decoder.document.metadata.author.url),
                url: decoder.document.metadata.author.url,
                target: '_blank',
              },
              {
                label: 'Date',
                content: formatTextValue(decoder.document.metadata.author.date),
              },
            ])}
          </ContentPanel>
        </>
      )}

      {formatTextValue(decoder?.document?.metadata?.description) && (
        <>
          <EuiSpacer size="m" />
          <ContentPanel title="Description" hideHeaderBorder>
            <EuiText size="s">
              <p>{formatTextValue(decoder.document.metadata.description)}</p>
            </EuiText>
          </ContentPanel>
        </>
      )}
    </>
  );

  const yamlContent = (
    <EuiCodeBlock language="yaml" isCopyable={true}>
      {typeof decoder?.decoder === 'string' ? decoder?.decoder : JSON.stringify(decoder?.decoder, null, 2) ?? ''}
    </EuiCodeBlock>
  );

  const jsonContent = (
    <EuiCodeBlock language="json" isCopyable={true}>
      {decoderJson}
    </EuiCodeBlock>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="decoder-details-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{decoder?.document?.name ? `Decoder details - ${decoder.document.name}` : 'Decoder'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && <EuiLoadingContent lines={4} />}
        {!loading && error && (
          <EuiCallOut color="danger" iconType="alert" title={error} />
        )}
        {!loading && !error && decoder && (
          <EuiTabbedContent
            tabs={[
              { id: 'visual', name: 'Visual', content: detailsContent },
              { id: 'yaml', name: 'YAML', content: yamlContent },
              { id: 'json', name: 'JSON', content: jsonContent },
            ]}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
