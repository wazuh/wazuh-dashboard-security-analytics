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
import { FilterDocument } from '../../../../types';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { BadgeGroup } from '../../../components/Utility/BadgeGroup';
import {
  CopyableValue,
  DetailsCodeBlock,
  DetailsFlyoutHeader,
  DetailsOverview,
  DetailsSection,
  DetailsToolbar,
  LabeledBadge,
  ReferencesSection,
  formatDetailsDate,
} from '../../../components/DetailsFlyout/DetailsFlyout';
import { FILTER_TYPE_OPTIONS } from '../utils/constants';
import { mapYamlToLosslessObject } from '../../../components/YamlForm';
import { stringify as LosslessStringify } from 'lossless-json';
import { checkToFormString } from '../utils/mappers';
import { DataStore } from '../../../store/DataStore';
import { useLazyFetch } from '../../../hooks/useLazyFetch';

interface FilterDetailsFlyoutProps {
  filterId: string;
  onClose: () => void;
}

/** Resolve author display: indexer sends string; legacy may send { name } */
const getAuthorDisplay = (author: string | { name?: string } | undefined): string => {
  if (!author) return '';
  if (typeof author === 'string') return author;
  return author.name ?? '';
};

export const FilterDetailsFlyout: React.FC<FilterDetailsFlyoutProps> = ({ filterId, onClose }) => {
  const [selectedView, setSelectedView] = useState('visual');
  const fetchFilter = useCallback(() => DataStore.filters.getFilter(filterId), [filterId]);
  const { data: filter, loading, error } = useLazyFetch(fetchFilter, 'Filter not found.');

  const document = filter?.document ?? {
    id: '',
    name: '',
    type: '',
    check: '',
    enabled: false,
  };

  const metadata = document.metadata ?? {};
  const supports = metadata.supports ?? [];
  const id = document.id || filter?.id;
  const sha256 = filter?.hash?.sha256;
  const typeLabel =
    FILTER_TYPE_OPTIONS.find((option) => option.value === document.type)?.text ?? document.type;

  const { filterJson, checkDisplayYaml } = useMemo(() => {
    const fallbackJson = () => JSON.stringify(filter?.document ?? {}, null, 2);
    const fallbackCheck = () => checkToFormString(document.check);

    if (!filter) {
      return { filterJson: '', checkDisplayYaml: fallbackCheck() };
    }

    const rawYaml = typeof filter.yaml === 'string' ? filter.yaml : '';
    if (!rawYaml.trim()) {
      return { filterJson: fallbackJson(), checkDisplayYaml: fallbackCheck() };
    }

    try {
      const losslessDoc = mapYamlToLosslessObject<FilterDocument>(rawYaml);
      return {
        filterJson: LosslessStringify(losslessDoc, null, 2) ?? '',
        checkDisplayYaml: checkToFormString(losslessDoc?.check ?? document.check),
      };
    } catch {
      return { filterJson: fallbackJson(), checkDisplayYaml: fallbackCheck() };
    }
  }, [filter, document.check]);

  const renderContent = () => {
    if (loading) return <EuiLoadingContent lines={4} />;
    if (error) return <EuiCallOut color="danger" iconType="alert" title={error} />;
    if (!filter) return null;

    if (selectedView === 'yaml') {
      return (
        <EuiCodeBlock language="yaml" isCopyable={true}>
          {filter.yaml}
        </EuiCodeBlock>
      );
    }
    if (selectedView === 'json') {
      return (
        <EuiCodeBlock language="json" isCopyable={true} paddingSize="m">
          {filterJson}
        </EuiCodeBlock>
      );
    }
    return (
      <>
        <DetailsOverview
          description={metadata.description}
          descriptionTestSubj="filter_flyout_description"
          testSubj="filter_flyout_overview"
          items={[
            { title: 'Name', description: document.name },
            { title: 'Author', description: getAuthorDisplay(metadata.author) },
            { title: 'Created', description: formatDetailsDate(metadata.date) },
            { title: 'Modified', description: formatDetailsDate(metadata.modified) },
            {
              title: 'ID',
              description: id && (
                <CopyableValue value={id} ariaLabel="Copy ID" testSubj="filter_flyout_copy_id" />
              ),
            },
            {
              title: 'SHA256',
              description: sha256 && (
                <CopyableValue
                  value={sha256}
                  ariaLabel="Copy SHA256"
                  testSubj="filter_flyout_copy_sha256"
                />
              ),
            },
            { title: 'Documentation', description: metadata.documentation },
            {
              title: 'Supports',
              description: supports.length ? <BadgeGroup values={supports} /> : null,
            },
          ]}
        />
        <DetailsSection
          id="filter_flyout_section_check"
          testSubj="filter_flyout_section_check"
          title="Check"
          initialIsOpen
        >
          <DetailsCodeBlock
            language="yaml"
            code={checkDisplayYaml}
            testSubj="filter_flyout_check"
          />
        </DetailsSection>
        <ReferencesSection idPrefix="filter_flyout" urls={metadata.references} />
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      hideCloseButton
      ownFocus
      size="m"
      aria-labelledby="filter_flyout_title"
      data-test-subj="filter-details-flyout"
    >
      <DetailsFlyoutHeader
        eyebrow="Filter details"
        title={metadata.title || document.name}
        titleId="filter_flyout_title"
        onClose={onClose}
        closeButtonTestSubj="close-filter-details-flyout"
      />
      <EuiFlyoutBody>
        <EuiModalBody>
          <DetailsToolbar
            status={
              filter
                ? [
                    <EnabledHealth
                      key="enabled"
                      enabled={document.enabled}
                      data-test-subj="filter_flyout_enabled"
                    />,
                    <LabeledBadge
                      key="type"
                      label="Type"
                      value={typeLabel}
                      testSubj="filter_flyout_type"
                    />,
                    <LabeledBadge
                      key="space"
                      label="Space"
                      value={filter.space?.name}
                      testSubj="filter_flyout_space"
                    />,
                  ]
                : []
            }
            selectedView={selectedView}
            onChangeView={setSelectedView}
            viewSwitchTestSubj="change-editor-type"
            viewSwitchLegend="This is editor type selector"
            isDisabled={loading || !!error || !filter}
          />
          {renderContent()}
        </EuiModalBody>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
