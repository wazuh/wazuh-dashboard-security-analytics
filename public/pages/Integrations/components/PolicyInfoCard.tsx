/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiCard,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingContent,
  EuiSpacer,
  EuiIconTip,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { DecoderSource, PolicyDocument, Space } from '../../../../types';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { ENRICHMENT_LABELS, EnrichmentType } from '../constants/enrichments';
import { formatIntegrationMetadataDate } from '../utils/helpers';
import { withPolicyGuard } from './PolicyGuard';
import { AssetIdentity } from '../../../components/AssetIdentity';
import { UI_DISABLED_SETTINGS_IDS, isUiSettingDisabled } from '../../../utils/helpers';

const truncateStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word',
};

const fullValueStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 'unset',
  WebkitBoxOrient: 'vertical',
  overflow: 'visible',
  textAlign: 'justify',
};

const renderValue = (
  value: string | undefined | null,
  noTruncate: boolean = false
): React.ReactNode => {
  if (!value) return '-';

  return (
    <span title={value} style={noTruncate ? fullValueStyle : truncateStyle}>
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

/**
 * the panel listed these settings without saying what any of them affects. Wording follows
 * the engine reference on the wazuh/wazuh 5.0.0 branch: `docs/ref/modules/engine/README.md`
 * defines each pipeline stage and what each toggle does to an event, and
 * `docs/ref/modules/engine/architecture.md` describes the routes table that maps a space to
 * its active policy, which is what analysisd drops when a policy is disabled.
 *
 * The enrichment examples come from this plugin's own catalog
 * (`../constants/enrichments.ts`), not from the engine's plugin list: the engine ships an
 * indicator of compromise enrichment that this catalog does not offer.
 */
const FIELD_HINTS = {
  status:
    'The policy is the pipeline the engine applies to every event in this space. While it is disabled the engine removes the route, so this space processes nothing.',
  rootDecoder:
    'Every event enters the decoder stage through the root decoder, the entry point of the decoder tree.',
  indexDiscardedEvents:
    'A filter can mark an event as discarded. Turn this on to index those events anyway. Turn it off and the engine rejects them, ending the pipeline.',
  indexUnclassifiedEvents:
    'An event is unclassified when the decoder that matched it belongs to an integration in the unclassified category. Turn this on to index those events. Turn it off and the engine drops them.',
  enrichments:
    'Plugins that add context to an event after decoding: geolocation, connection details, and URL and hash fields.',
} as const;

/** one title per field, so the skeleton and the loaded panel cannot drift. */
const FieldTitle: React.FC<{ label: string; hint: string }> = ({ label, hint }) => (
  <>
    {label} <EuiIconTip content={hint} position="right" />
  </>
);

const POLICY_INFO_TAB = {
  SETTINGS: 'settings',
  DETAILS: 'details',
} as const;
type PolicyInfoTabId = (typeof POLICY_INFO_TAB)[keyof typeof POLICY_INFO_TAB];

/**
 * Status drew a coloured health dot. The two indexing toggles printed a bare
 * lowercase `yes`/`no`. Same kind of value, two styles, side by side. Draw all three
 * here. The words still change per field: a policy is enabled or disabled, a toggle is
 * on or off.
 */
const renderBoolean = (
  value: boolean | undefined,
  hasPolicy: boolean,
  labels: { on: string; off: string }
): React.ReactNode => {
  if (!hasPolicy) return '-';
  return (
    <EuiHealth color={value ? 'success' : 'subdued'}>{value ? labels.on : labels.off}</EuiHealth>
  );
};

/** EuiSkeletonText is not available in all EUI builds; EuiLoadingContent is used elsewhere in this plugin. */
const ValueSkeleton: React.FC = () => <EuiLoadingContent lines={1} />;

/** Equal-width flex columns for Settings/Details horizontal rows. */
// with `minWidth: 0` a column shrank until values broke mid-word on a narrow
// viewport. Give it a floor, and let the rows wrap.
const COL: React.CSSProperties = { flex: '1 1 0', minWidth: '10rem' };

/** Details row 2 vs row 1 (5 cols): Documentation spans Title+Author; Description spans References+Date+Modified. */
const DETAILS_DOC_COL: React.CSSProperties = { flex: '2 1 0', minWidth: '10rem' };
const DETAILS_DESC_COL: React.CSSProperties = { flex: '3 1 0', minWidth: '10rem' };

const renderSettingsSkeletonRows = (
  showDiscardedEvents: boolean,
  showUnclassifiedEvents: boolean
) => (
  <>
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Status" hint={FIELD_HINTS.status} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Root decoder" hint={FIELD_HINTS.rootDecoder} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      {showDiscardedEvents && (
        <EuiFlexItem style={COL}>
          <EuiDescriptionList>
            <EuiDescriptionListTitle>
              <FieldTitle label="Index discarded events" hint={FIELD_HINTS.indexDiscardedEvents} />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <ValueSkeleton />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      )}
      {showUnclassifiedEvents && (
        <EuiFlexItem style={COL}>
          <EuiDescriptionList>
            <EuiDescriptionListTitle>
              <FieldTitle
                label="Index unclassified events"
                hint={FIELD_HINTS.indexUnclassifiedEvents}
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <ValueSkeleton />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Enrichments" hint={FIELD_HINTS.enrichments} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const detailsSkeletonRows = (
  <>
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
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
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Modified</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={DETAILS_DOC_COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <ValueSkeleton />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={DETAILS_DESC_COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiLoadingContent lines={2} />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

/** Same tab structure as loaded state; placeholders while policy is loading. */
const PolicyInfoCardSkeleton: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<PolicyInfoTabId>(POLICY_INFO_TAB.SETTINGS);
  const showIndexDiscardedEventsSetting = !isUiSettingDisabled(
    UI_DISABLED_SETTINGS_IDS.INDEX_DISCARDED_EVENTS
  );
  const showIndexUnclassifiedEventsSetting = !isUiSettingDisabled(
    UI_DISABLED_SETTINGS_IDS.INDEX_UNCLASSIFIED_EVENTS
  );

  return (
    <EuiCard
      textAlign="left"
      paddingSize="m"
      title={
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
      }
    >
      <EuiSpacer size="l" />
      {selectedTab === POLICY_INFO_TAB.SETTINGS
        ? renderSettingsSkeletonRows(
            showIndexDiscardedEventsSetting,
            showIndexUnclassifiedEventsSetting
          )
        : detailsSkeletonRows}
    </EuiCard>
  );
};

const renderSettingsPanel = (
  hasPolicy: boolean,
  policyDocumentData: PolicyDocument | undefined,
  rootDecoder: DecoderSource | undefined,
  enrichmentsDisplay: React.ReactNode,
  showDiscardedEvents: boolean,
  showUnclassifiedEvents: boolean
) => (
  <>
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Status" hint={FIELD_HINTS.status} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderBoolean(policyDocumentData?.enabled, hasPolicy, {
              on: 'Enabled',
              off: 'Disabled',
            })}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Root decoder" hint={FIELD_HINTS.rootDecoder} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {hasPolicy ? (
              <AssetIdentity
                title={rootDecoder?.document?.metadata?.title}
                identifier={rootDecoder?.document?.name}
              />
            ) : (
              '-'
            )}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      {showDiscardedEvents && (
        <EuiFlexItem style={COL}>
          <EuiDescriptionList>
            <EuiDescriptionListTitle>
              <FieldTitle label="Index discarded events" hint={FIELD_HINTS.indexDiscardedEvents} />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {renderBoolean(policyDocumentData?.index_discarded_events, hasPolicy, {
                on: 'On',
                off: 'Off',
              })}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      )}
      {showUnclassifiedEvents && (
        <EuiFlexItem style={COL}>
          <EuiDescriptionList>
            <EuiDescriptionListTitle>
              <FieldTitle
                label="Index unclassified events"
                hint={FIELD_HINTS.indexUnclassifiedEvents}
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {renderBoolean(policyDocumentData?.index_unclassified_events, hasPolicy, {
                on: 'On',
                off: 'Off',
              })}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <FieldTitle label="Enrichments" hint={FIELD_HINTS.enrichments} />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{enrichmentsDisplay}</EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
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
  <>
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderValue(typeof title === 'string' ? title : undefined)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderValue(typeof author === 'string' ? author : undefined)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>References</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderValue(
              !hasPolicy
                ? undefined
                : Array.isArray(references)
                ? references.join(', ')
                : (references as string) ?? ''
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
      </EuiFlexItem>
      <EuiFlexItem style={COL}>
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
    </EuiFlexGroup>
    <EuiSpacer size="l" />
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
      <EuiFlexItem style={DETAILS_DOC_COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderValue(typeof documentation === 'string' ? documentation : undefined, true)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem style={DETAILS_DESC_COL}>
        <EuiDescriptionList>
          <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {renderValue(typeof description === 'string' ? description : undefined, true)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
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
  const showIndexDiscardedEventsSetting = !isUiSettingDisabled(
    UI_DISABLED_SETTINGS_IDS.INDEX_DISCARDED_EVENTS
  );
  const showIndexUnclassifiedEventsSetting = !isUiSettingDisabled(
    UI_DISABLED_SETTINGS_IDS.INDEX_UNCLASSIFIED_EVENTS
  );

  // badges, one per enrichment. Joined by commas they read as one sentence, and
  // you cannot scan a long list of them.
  const enrichments = hasPolicy ? policyDocumentData?.enrichments ?? [] : [];
  const enrichmentsDisplay = enrichments.length ? (
    // this group is a block, so it misses the leading gap that
    // EuiDescriptionListDescription gives the text values.
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} style={{ marginTop: 4 }}>
      {enrichments.map((enrichment) => (
        <EuiFlexItem grow={false} key={enrichment}>
          <EuiBadge color="hollow">
            {ENRICHMENT_LABELS[enrichment as EnrichmentType] ?? enrichment}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : (
    '-'
  );

  return (
    <EuiCard
      textAlign="left"
      paddingSize="m"
      title={
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
      }
    >
      <EuiSpacer size="l" />
      {selectedTab === POLICY_INFO_TAB.SETTINGS
        ? renderSettingsPanel(
            hasPolicy,
            policyDocumentData,
            rootDecoder,
            enrichmentsDisplay,
            showIndexDiscardedEventsSetting,
            showIndexUnclassifiedEventsSetting
          )
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
    includeIntegrationsMap: false,
    _source: { excludes: ['document.integrations', 'document.filters'] },
  },
  {
    rerunOn: ({ space, refresh }) => [space, refresh],
    loadingComponent: PolicyInfoCardLoading,
  }
)(
  ({
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
  }) => <PolicyInfoCardLayout policyDocumentData={policyDocumentData} rootDecoder={rootDecoder} />
);
