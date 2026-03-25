/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import {
  EuiCard,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiTitle,
} from '@elastic/eui';
import { DecoderSource, PolicyDocument, Space } from '../../../../types';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { ENRICHMENT_LABELS, EnrichmentType } from '../constants/enrichments';
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

/** Read metadata fields with fallback to legacy top-level fields (backward compat) */
const getMetadataValue = (
  doc: PolicyDocument | undefined,
  field: 'title' | 'author' | 'description' | 'documentation' | 'references'
): string | string[] | undefined => {
  if (!doc) return undefined;
  const value = doc.metadata?.[field];
  if (value !== undefined && value !== null) return value;
  const legacy = doc as unknown as Record<string, unknown>;
  return legacy[field] as string | string[] | undefined;
};

const renderYesNoOrDash = (value: boolean | undefined, hasPolicy: boolean): React.ReactNode => {
  if (!hasPolicy) return '-';
  return value ? 'yes' : 'no';
};

/** EuiSkeletonText is not available in all EUI builds; EuiLoadingContent is used elsewhere in this plugin. */
const ValueSkeleton: React.FC = () => <EuiLoadingContent lines={1} />;

/** Same labels and grid as loaded state; animated placeholders while policy is loading. */
const PolicyInfoCardSkeleton: React.FC = () => (
  <EuiCard
    textAlign="left"
    paddingSize="m"
    title={
      <EuiTitle size="s">
        <h3>Space details</h3>
      </EuiTitle>
    }
  >
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Enabled</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Enrichments</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Root decoder</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Index unclassified events</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiLoadingContent lines={2} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>References</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiDescriptionList>
              <EuiDescriptionListTitle>Index discarded events</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <ValueSkeleton />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCard>
);

/** Loaded policy: same labels; values show "-" only when a field is empty. */
export const PolicyInfoCardLayout: React.FC<{
  policyDocumentData?: PolicyDocument;
  rootDecoder?: DecoderSource;
}> = ({ policyDocumentData, rootDecoder }) => {
  const hasPolicy = Boolean(policyDocumentData);
  const title = getMetadataValue(policyDocumentData, 'title');
  const documentation = getMetadataValue(policyDocumentData, 'documentation');
  const author = getMetadataValue(policyDocumentData, 'author');
  const description = getMetadataValue(policyDocumentData, 'description');
  const references = getMetadataValue(policyDocumentData, 'references');

  const enrichmentsDisplay = !hasPolicy
    ? '-'
    : policyDocumentData?.enrichments && policyDocumentData.enrichments.length > 0
      ? policyDocumentData.enrichments
          .map((e) => ENRICHMENT_LABELS[e as EnrichmentType] ?? e)
          .join(', ')
      : '-';

  return (
    <EuiCard
      textAlign="left"
      paddingSize="m"
      title={
        <EuiTitle size="s">
          <h3>Space details</h3>
        </EuiTitle>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderValue(typeof title === 'string' ? title : undefined)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderValue(typeof documentation === 'string' ? documentation : undefined)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Enabled</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderYesNoOrDash(policyDocumentData?.enabled, hasPolicy)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Enrichments</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{enrichmentsDisplay}</EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderValue(typeof author === 'string' ? author : undefined)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Root decoder</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderValue(hasPolicy ? rootDecoder?.document?.name ?? '' : undefined)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Index unclassified events</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderYesNoOrDash(policyDocumentData?.index_unclassified_events, hasPolicy)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderValue(typeof description === 'string' ? description : undefined)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: 0 }}>
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
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>Index discarded events</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {renderYesNoOrDash(policyDocumentData?.index_discarded_events, hasPolicy)}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
