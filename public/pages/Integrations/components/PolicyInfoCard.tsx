/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import {
  EuiCard,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { DecoderSource, PolicyDocument, Space } from '../../../../types';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { ENRICHMENT_LABELS, EnrichmentType } from '../constants/enrichments';
import { formatIntegrationMetadataDate } from '../utils/helpers';
import { withPolicyGuard } from './PolicyGuard';

const truncateStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all',
};

const renderValue = (value: string | undefined | null): React.ReactNode => {
  if (!value) return '-';

  return (
    <span title={value} style={truncateStyle}>
      {value}
    </span>
  );
};

type MetadataField =
  | 'title'
  | 'author'
  | 'description'
  | 'documentation'
  | 'references'
  | 'date'
  | 'modified';

/** Read metadata fields with fallback to legacy top-level fields (backward compat) */
const getMetadataValue = (
  doc: PolicyDocument | undefined,
  field: MetadataField
): string | string[] | undefined => {
  if (!doc) return undefined;
  const value = doc.metadata?.[field];
  if (value !== undefined && value !== null) return value;
  const legacy = doc as unknown as Record<string, unknown>;
  return legacy[field] as string | string[] | undefined;
};

const POLICY_INFO_TAB = {
  SETTINGS: 'settings',
  DETAILS: 'details',
} as const;
type PolicyInfoTabId = (typeof POLICY_INFO_TAB)[keyof typeof POLICY_INFO_TAB];

const renderYesNoOrDash = (value: boolean | undefined, hasPolicy: boolean): React.ReactNode => {
  if (!hasPolicy) return '-';
  return value ? 'yes' : 'no';
};

/** EuiSkeletonText is not available in all EUI builds; EuiLoadingContent is used elsewhere in this plugin. */
const ValueSkeleton: React.FC = () => <EuiLoadingContent lines={1} />;

/** Equal-width columns for multi-column Space details (matches legacy 4-column layout). */
const COL: React.CSSProperties = { flex: '1 1 0', minWidth: 0 };

/** Same 4-column pattern as Details: col1–2 stacked fields, col3–4 reserved. */
const settingsSkeletonRows = (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap={false}>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Root decoder</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="s" color="subdued" hasShadow={false}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Enabled</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Index unclassified events</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Index discarded events</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Enrichments</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL} />
    <EuiFlexItem style={COL} />
  </EuiFlexGroup>
);

const detailsSkeletonRows = (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap={false}>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLoadingContent lines={2} />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>References</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Date</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Modified</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <ValueSkeleton />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL} />
  </EuiFlexGroup>
);

/** Same tab structure as loaded state; placeholders while policy is loading. */
const PolicyInfoCardSkeleton: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<PolicyInfoTabId>(POLICY_INFO_TAB.SETTINGS);

  return (
    <EuiCard textAlign="left" paddingSize="m">
      <EuiTabs size="s">
        <EuiTab
          isSelected={selectedTab === POLICY_INFO_TAB.SETTINGS}
          onClick={() => setSelectedTab(POLICY_INFO_TAB.SETTINGS)}
        >
          Settings
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === POLICY_INFO_TAB.DETAILS}
          onClick={() => setSelectedTab(POLICY_INFO_TAB.DETAILS)}
        >
          Details
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === POLICY_INFO_TAB.SETTINGS ? settingsSkeletonRows : detailsSkeletonRows}
    </EuiCard>
  );
};

const renderSettingsPanel = (
  hasPolicy: boolean,
  policyDocumentData: PolicyDocument | undefined,
  rootDecoder: DecoderSource | undefined,
  enrichmentsDisplay: string
) => (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap={false}>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Root decoder</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(hasPolicy ? rootDecoder?.document?.name ?? '' : undefined)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="s" color="subdued" hasShadow={false}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Enabled</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiText size="m">
              <strong>{renderYesNoOrDash(policyDocumentData?.enabled, hasPolicy)}</strong>
            </EuiText>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Index unclassified events</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderYesNoOrDash(policyDocumentData?.index_unclassified_events, hasPolicy)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Index discarded events</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderYesNoOrDash(policyDocumentData?.index_discarded_events, hasPolicy)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Enrichments</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{enrichmentsDisplay}</EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL} />
    <EuiFlexItem style={COL} />
  </EuiFlexGroup>
);

const renderDetailsPanel = (
  hasPolicy: boolean,
  title: string | string[] | undefined,
  author: string | string[] | undefined,
  description: string | string[] | undefined,
  documentation: string | string[] | undefined,
  references: string | string[] | undefined,
  dateStr: string | string[] | undefined,
  modifiedStr: string | string[] | undefined
) => (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap={false}>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(typeof title === 'string' ? title : undefined)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(typeof author === 'string' ? author : undefined)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(typeof description === 'string' ? description : undefined)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(typeof documentation === 'string' ? documentation : undefined)}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>References</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(
            !hasPolicy
              ? undefined
              : Array.isArray(references)
                ? references.join(', ')
                : ((references as string) ?? '')
          )}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL}>
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Date</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(
            !hasPolicy
              ? undefined
              : typeof dateStr === 'string'
                ? formatIntegrationMetadataDate(dateStr) || undefined
                : undefined
          )}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Modified</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {renderValue(
            !hasPolicy
              ? undefined
              : typeof modifiedStr === 'string'
                ? formatIntegrationMetadataDate(modifiedStr) || undefined
                : undefined
          )}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem style={COL} />
  </EuiFlexGroup>
);

/** Loaded policy: Settings vs Details tabs; values show "-" when empty. */
export const PolicyInfoCardLayout: React.FC<{
  policyDocumentData?: PolicyDocument;
  rootDecoder?: DecoderSource;
}> = ({ policyDocumentData, rootDecoder }) => {
  const [selectedTab, setSelectedTab] = useState<PolicyInfoTabId>(POLICY_INFO_TAB.SETTINGS);
  const hasPolicy = Boolean(policyDocumentData);
  const title = getMetadataValue(policyDocumentData, 'title');
  const documentation = getMetadataValue(policyDocumentData, 'documentation');
  const author = getMetadataValue(policyDocumentData, 'author');
  const description = getMetadataValue(policyDocumentData, 'description');
  const references = getMetadataValue(policyDocumentData, 'references');
  const dateStr = getMetadataValue(policyDocumentData, 'date');
  const modifiedStr = getMetadataValue(policyDocumentData, 'modified');

  const enrichmentsDisplay = !hasPolicy
    ? '-'
    : policyDocumentData?.enrichments && policyDocumentData.enrichments.length > 0
      ? policyDocumentData.enrichments
          .map((e) => ENRICHMENT_LABELS[e as EnrichmentType] ?? e)
          .join(', ')
      : '-';

  return (
    <EuiCard textAlign="left" paddingSize="m">
      <EuiTabs size="s">
        <EuiTab
          isSelected={selectedTab === POLICY_INFO_TAB.SETTINGS}
          onClick={() => setSelectedTab(POLICY_INFO_TAB.SETTINGS)}
        >
          Settings
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === POLICY_INFO_TAB.DETAILS}
          onClick={() => setSelectedTab(POLICY_INFO_TAB.DETAILS)}
        >
          Details
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === POLICY_INFO_TAB.SETTINGS
        ? renderSettingsPanel(hasPolicy, policyDocumentData, rootDecoder, enrichmentsDisplay)
        : renderDetailsPanel(
            hasPolicy,
            title,
            author,
            description,
            documentation,
            references,
            dateStr,
            modifiedStr
          )}
    </EuiCard>
  );
};

const PolicyInfoCardLoading: React.FC = () => <PolicyInfoCardSkeleton />;

export const PolicyInfoCard: React.FC<{}> = withPolicyGuard(
  {
    includeIntegrationFields: ['document'],
  },
  {
    rerunOn: ({ space, refresh }) => [space, refresh],
    loadingComponent: PolicyInfoCardLoading,
  }
)(({
  policyDocumentData,
  rootDecoder,
  notifications: _notifications,
  space: _space,
}: {
  policyDocumentData: PolicyDocument;
  rootDecoder: DecoderSource;
  notifications: NotificationsStart;
  space: Space;
  refresh?: number;
}) => <PolicyInfoCardLayout policyDocumentData={policyDocumentData} rootDecoder={rootDecoder} />);
