/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiLoadingContent,
  EuiModalBody,
} from '@elastic/eui';
import { DecoderDocument } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { BadgeGroup } from '../../../components/Utility/BadgeGroup';
import {
  CopyableValue,
  DetailsFlyoutHeader,
  DetailsOverview,
  DetailsToolbar,
  LabeledBadge,
  ReferencesSection,
  formatDetailsDate,
} from '../../../components/DetailsFlyout/DetailsFlyout';
import { stringify as LosslessStringify } from 'lossless-json';
import { mapYamlToLosslessObject } from '../../../components/YamlForm';
import { useLazyFetch } from '../../../hooks/useLazyFetch';
interface DecoderDetailsFlyoutProps {
  decoderId: string;
  space: string;
  onClose: () => void;
}

export const DecoderDetailsFlyout: React.FC<DecoderDetailsFlyoutProps> = ({
  decoderId,
  space,
  onClose,
}) => {
  const [selectedView, setSelectedView] = useState('visual');
  const fetchDecoder = useCallback(() => DataStore.decoders.getDecoder(decoderId, space), [
    decoderId,
    space,
  ]);
  const { data: decoder, loading, error } = useLazyFetch(fetchDecoder, 'Decoder not found.');

  const decoderJson = useMemo(() => {
    if (!decoder) return '';
    try {
      const rawYaml = typeof decoder.yaml === 'string' ? decoder.yaml : null;
      if (rawYaml) {
        const losslessDoc = mapYamlToLosslessObject<DecoderDocument>(rawYaml);
        return LosslessStringify(losslessDoc, null, 2) ?? '';
      }
      return JSON.stringify(decoder?.document, null, 2);
    } catch (err) {
      return JSON.stringify(decoder?.document, null, 2) ?? '';
    }
  }, [decoder]);

  const metadata = decoder?.document?.metadata;
  const name = decoder?.document?.name;
  const id = decoder?.document?.id;

  const detailsContent = (
    <>
      <DetailsOverview
        description={metadata?.description}
        descriptionTestSubj="decoder_flyout_description"
        testSubj="decoder_flyout_overview"
        items={[
          {
            title: 'Name',
            description: name && (
              <CopyableValue
                value={name}
                ariaLabel="Copy name"
                testSubj="decoder_flyout_copy_name"
              />
            ),
          },
          { title: 'Integration', description: decoder?.integrations?.join(', ') },
          { title: 'Author', description: metadata?.author },
          { title: 'Created', description: formatDetailsDate(metadata?.date) },
          { title: 'Modified', description: formatDetailsDate(metadata?.modified) },
          {
            title: 'ID',
            description: id && (
              <CopyableValue value={id} ariaLabel="Copy ID" testSubj="decoder_flyout_copy_id" />
            ),
          },
          { title: 'Documentation', description: metadata?.documentation },
          {
            title: 'Supports',
            description: metadata?.supports?.length ? (
              <BadgeGroup values={metadata.supports} />
            ) : null,
          },
        ]}
      />
      <ReferencesSection idPrefix="decoder_flyout" urls={metadata?.references} />
    </>
  );

  const yamlContent = (
    <EuiCodeBlock language="yaml" isCopyable={true}>
      {typeof decoder?.yaml === 'string'
        ? decoder?.yaml
        : JSON.stringify(decoder?.yaml, null, 2) ?? ''}
    </EuiCodeBlock>
  );

  const jsonContent = (
    <EuiCodeBlock language="json" isCopyable={true}>
      {decoderJson}
    </EuiCodeBlock>
  );

  const renderContent = () => {
    if (loading) {
      return <EuiLoadingContent lines={4} />;
    }
    if (error) {
      return <EuiCallOut color="danger" iconType="alert" title={error} />;
    }
    if (!decoder) {
      return null;
    }
    if (selectedView === 'yaml') {
      return yamlContent;
    }
    if (selectedView === 'json') {
      return jsonContent;
    }
    return detailsContent;
  };

  return (
    <EuiFlyout
      onClose={onClose}
      hideCloseButton
      ownFocus={true}
      size="m"
      aria-labelledby="decoder_flyout_title"
      data-test-subj="decoder-details-flyout"
    >
      <DetailsFlyoutHeader
        eyebrow="Decoder details"
        title={metadata?.title || name}
        titleId="decoder_flyout_title"
        onClose={onClose}
        closeButtonTestSubj="close-decoder-details-flyout"
      />
      <EuiFlyoutBody>
        <EuiModalBody>
          <DetailsToolbar
            status={
              decoder
                ? [
                    <EnabledHealth
                      key="enabled"
                      enabled={decoder.document?.enabled}
                      data-test-subj="decoder_flyout_enabled"
                    />,
                    <LabeledBadge
                      key="space"
                      label="Space"
                      value={decoder.space}
                      testSubj="decoder_flyout_space"
                    />,
                  ]
                : []
            }
            selectedView={selectedView}
            onChangeView={setSelectedView}
            viewSwitchTestSubj="decoder-details-view-selector"
            viewSwitchLegend="Decoder view selector"
            isDisabled={loading || !!error || !decoder}
          />
          {renderContent()}
        </EuiModalBody>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
