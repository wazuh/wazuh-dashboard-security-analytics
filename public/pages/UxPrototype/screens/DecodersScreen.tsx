/*
 * PROTOTYPE — throwaway. R6 + F8.4 + R9 on one screen:
 *  - one page template (EuiPageHeader) with a real slot for title, description,
 *    scope note and the primary action, instead of a hand-rolled flex header
 *  - space-aware columns: hide what is invariant in this stage, collapse Name and
 *    Title into one cell so rows are one line instead of three
 *  - empty states that teach, and that distinguish "nothing here" from "nothing matched"
 *  - the searchable fields are named, instead of failing silently on a bad query
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiCompressedFieldSearch,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import {
  DecoderRow,
  decoderTotalForStage,
  decodersForStage,
  StageId,
  stageById,
} from '../mockData';

interface Props {
  scopeBar?: React.ReactNode;
  stage: StageId;
  onStageChange: (stage: StageId) => void;
}

const SEARCHABLE = ['name', 'title', 'integration', 'author', 'enabled'];

export const DecodersScreen: React.FC<Props> = ({ stage, onStageChange, scopeBar }) => {
  const [query, setQuery] = useState('');
  const [showAllColumns, setShowAllColumns] = useState(false);

  const rows = decodersForStage(stage);
  const total = decoderTotalForStage(stage);
  const readOnly = stage === 'standard';
  const editable = stage === 'draft';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.title, row.integration, row.author].some((value) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  /** In Standard every row reads "Wazuh, Inc." and "Enabled" — four columns of noise. */
  const invariantColumns = readOnly && !showAllColumns;

  const columns = [
    {
      field: 'title',
      name: 'Decoder',
      sortable: true,
      render: (title: string, row: DecoderRow) => (
        <div style={{ minWidth: 0 }}>
          <EuiText size="s" style={{ fontWeight: 600 }}>
            {title}
          </EuiText>
          <EuiText
            size="xs"
            color="subdued"
            style={{
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.name}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'integration',
      name: 'Integration',
      width: '220px',
      sortable: true,
      render: (integration: string) => <EuiBadge color="hollow">{integration}</EuiBadge>,
    },
    ...(invariantColumns
      ? []
      : [
          {
            field: 'author',
            name: 'Author',
            width: '140px',
            sortable: true,
          },
          {
            field: 'enabled',
            name: 'Status',
            width: '110px',
            sortable: true,
            render: (enabled: boolean) => (
              <EuiHealth color={enabled ? 'success' : 'subdued'}>
                {enabled ? 'Enabled' : 'Disabled'}
              </EuiHealth>
            ),
          },
        ]),
    ...(stage === 'custom' || stage === 'test'
      ? [
          {
            field: 'lastTested',
            name: 'Last tested',
            width: '160px',
            render: (value?: string) => (
              <EuiText size="xs" color={value === 'never tested' ? 'danger' : 'subdued'}>
                {value ?? '—'}
              </EuiText>
            ),
          },
        ]
      : []),
    {
      name: 'Actions',
      width: '96px',
      actions: [
        {
          name: 'View',
          description: 'View decoder',
          icon: 'inspect',
          type: 'icon' as const,
          onClick: () => undefined,
        },
        {
          name: 'Edit',
          description: readOnly
            ? 'Standard content is read-only'
            : `Edit this decoder in ${stageById(stage).label}`,
          icon: 'pencil',
          type: 'icon' as const,
          enabled: () => editable,
          onClick: () => undefined,
        },
      ],
    },
  ];

  const createButton = (
    <EuiToolTip
      content={
        editable
          ? 'Create a decoder in Draft'
          : `Decoders can only be created in Draft. You are in ${stageById(stage).label}.`
      }
    >
      <EuiSmallButton fill={true} iconType="plusInCircle" disabled={!editable}>
        Create decoder
      </EuiSmallButton>
    </EuiToolTip>
  );

  return (
    <>
      <EuiPageHeader
        pageTitle="Decoders"
        description={`A decoder turns a raw log line into normalized fields. Showing ${
          stageById(stage).label
        } content.`}
        rightSideItems={[createButton]}
        bottomBorder={true}
      />
      {scopeBar}
      <EuiSpacer size="l" />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={true}>
          <EuiFlexItem>
            <EuiCompressedFieldSearch
              fullWidth={true}
              aria-label="Search decoders"
              placeholder="Search decoders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              isClearable={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {query ? `${filtered.length} of ${total}` : `${total} decoders`}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          Searchable fields: {SEARCHABLE.join(', ')}. Plain text matches name, title and
          integration.
        </EuiText>

        {invariantColumns && rows.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              Author and Status are hidden — every row in Standard carries the same value.{' '}
              <EuiLink onClick={() => setShowAllColumns(true)}>Show all columns</EuiLink>
            </EuiText>
          </>
        )}
        {showAllColumns && readOnly && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              Showing invariant columns.{' '}
              <EuiLink onClick={() => setShowAllColumns(false)}>Hide them</EuiLink>
            </EuiText>
          </>
        )}

        <EuiSpacer size="m" />

        {rows.length === 0 && (
          <>
            <EuiEmptyPrompt
              iconType="indexEdit"
              title={<h2>No decoders in {stageById(stage).label} yet</h2>}
              body={
                <EuiText size="s">
                  A decoder turns a raw log line into normalized fields. Each one belongs to an
                  integration — create the integration first, then add decoders to it.
                </EuiText>
              }
              actions={[
                <EuiSmallButton fill={true} iconType="plusInCircle">
                  Create decoder
                </EuiSmallButton>,
                <EuiSmallButtonEmpty iconType="documentation">
                  How decoders work
                </EuiSmallButtonEmpty>,
              ]}
            />
            <EuiText size="xs" color="subdued" textAlign="center">
              Looking for built-in decoders?{' '}
              <EuiLink onClick={() => onStageChange('standard')}>Switch to Standard</EuiLink> — 505
              decoders ship with Wazuh.
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {rows.length > 0 && filtered.length === 0 && (
          <EuiCallOut
            size="s"
            color="primary"
            iconType="search"
            title={`No decoders in ${stageById(stage).label} match “${query}”`}
          >
            <EuiText size="s">
              {total} decoders exist in this stage.{' '}
              <EuiLink onClick={() => setQuery('')}>Clear the search</EuiLink> to see them.
            </EuiText>
          </EuiCallOut>
        )}

        {filtered.length > 0 && (
          <EuiInMemoryTable
            items={filtered}
            columns={columns}
            itemId="id"
            sorting={true}
            pagination={{ initialPageSize: 25, pageSizeOptions: [25, 50, 100] }}
            tableLayout="auto"
          />
        )}
      </EuiPanel>
      <EuiSpacer size="xl" />
    </>
  );
};
