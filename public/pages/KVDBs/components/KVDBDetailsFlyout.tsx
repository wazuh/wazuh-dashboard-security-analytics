/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiModalBody,
  EuiLoadingContent,
} from '@elastic/eui';
import { AssetViewer } from './AssetViewer';
import { BadgeGroup } from '../../../components/Utility/BadgeGroup';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import {
  CopyableValue,
  DetailsFlyoutHeader,
  DetailsOverview,
  DetailsSection,
  DetailsToolbar,
  LabeledBadge,
  ReferencesSection,
  formatDetailsDate,
} from '../../../components/DetailsFlyout/DetailsFlyout';
import { DataStore } from '../../../store/DataStore';
import { useLazyFetch } from '../../../hooks/useLazyFetch';

interface KVDBDetailsFlyoutProps {
  kvdbId: string;
  onClose: () => void;
}

const VISUAL_VIEW = {
  VISUAL: 'visual',
  YAML: 'yaml',
  JSON: 'json',
};

export const KVDBDetailsFlyout: React.FC<KVDBDetailsFlyoutProps> = ({ kvdbId, onClose }) => {
  const [selectedView, setSelectedView] = useState(VISUAL_VIEW.VISUAL);
  const fetchKvdb = useCallback(() => DataStore.kvdbs.getKVDB(kvdbId), [kvdbId]);
  const { data: kvdb, loading, error } = useLazyFetch(fetchKvdb, 'KVDB not found.');

  const document = kvdb?.document ?? { id: '' };
  const metadata = document.metadata;

  const id = document.id || kvdb?.id;
  const space = typeof kvdb?.space === 'string' ? kvdb.space : kvdb?.space?.name;

  const renderBody = () => {
    if (loading) return <EuiLoadingContent lines={4} />;
    if (error) return <EuiCallOut color="danger" iconType="alert" title={error} />;
    if (!kvdb) return null;

    const visualTab = (
      <>
        <DetailsOverview
          description={metadata?.description}
          descriptionTestSubj="kvdb_flyout_description"
          testSubj="kvdb_flyout_overview"
          items={[
            { title: 'Integration', description: kvdb.integration?.title },
            { title: 'Author', description: metadata?.author },
            { title: 'Created', description: formatDetailsDate(metadata?.date) },
            { title: 'Modified', description: formatDetailsDate(metadata?.modified) },
            {
              title: 'ID',
              description: id && (
                <CopyableValue value={id} ariaLabel="Copy ID" testSubj="kvdb_flyout_copy_id" />
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
        {document.content && (
          <DetailsSection
            id="kvdb_flyout_section_content"
            testSubj="kvdb_flyout_section_content"
            title="Content"
            initialIsOpen
          >
            <AssetViewer content={document.content} />
          </DetailsSection>
        )}
        <ReferencesSection idPrefix="kvdb_flyout" urls={metadata?.references} />
      </>
    );
    const yamlTab = (
      <EuiCodeBlock language="yaml" isCopyable={true} paddingSize="m">
        {kvdb.yaml ?? ''}
      </EuiCodeBlock>
    );

    const jsonTab = (
      <EuiCodeBlock language="json" isCopyable={true} paddingSize="m">
        {JSON.stringify(document, null, 2)}
      </EuiCodeBlock>
    );

    if (selectedView === VISUAL_VIEW.YAML) return yamlTab;
    if (selectedView === VISUAL_VIEW.JSON) return jsonTab;
    return visualTab;
  };

  return (
    <EuiFlyout
      onClose={onClose}
      hideCloseButton
      ownFocus
      size="m"
      aria-labelledby="kvdb_flyout_title"
      data-test-subj="kvdb-details-flyout"
    >
      <DetailsFlyoutHeader
        eyebrow="KVDB details"
        title={metadata?.title}
        titleId="kvdb_flyout_title"
        onClose={onClose}
        closeButtonTestSubj="close-kvdb-details-flyout"
      />
      <EuiFlyoutBody>
        <EuiModalBody>
          <DetailsToolbar
            status={
              kvdb
                ? [
                    <EnabledHealth
                      key="enabled"
                      enabled={document.enabled}
                      data-test-subj="kvdb_flyout_enabled"
                    />,
                    <LabeledBadge
                      key="space"
                      label="Space"
                      value={space}
                      testSubj="kvdb_flyout_space"
                    />,
                  ]
                : []
            }
            selectedView={selectedView}
            onChangeView={setSelectedView}
            viewSwitchTestSubj="change-editor-type"
            viewSwitchLegend="This is editor type selector"
            isDisabled={loading || !!error || !kvdb}
          />
          {renderBody()}
        </EuiModalBody>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
