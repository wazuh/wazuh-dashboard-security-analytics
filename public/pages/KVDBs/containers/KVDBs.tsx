/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSearchBar,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiPopover,
  EuiButtonGroup,
  EuiLink
} from "@elastic/eui";
import { RouteComponentProps } from "react-router-dom";
import { KVDBItem } from "../../../../types";
import { DataStore } from "../../../store/DataStore";
import { BREADCRUMBS, DEFAULT_EMPTY_DATA } from "../../../utils/constants";
import { PageHeader } from "../../../components/PageHeader/PageHeader";
import { setBreadcrumbs } from "../../../utils/helpers";
import {
  KVDBS_PAGE_SIZE,
  KVDBS_SEARCH_SCHEMA,
  KVDBS_SORT_FIELD,
} from "../utils/constants";
import { KVDBDetailsFlyout } from "../components/KVDBDetailsFlyout";
import { SpaceTypes } from "../../../../common/constants";

export const KVDBs: React.FC<RouteComponentProps> = () => {
  const [items, setItems] = useState<KVDBItem[]>([]);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(KVDBS_PAGE_SIZE);
  const [sortField, setSortField] = useState(KVDBS_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<any>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedKVDB, setSelectedKVDB] = useState<KVDBItem | null>(null);
  const [spaceFilter, setSpaceFilter] = useState<string>(SpaceTypes.STANDARD.value);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState<boolean>(false);
  const [infoPopoverOpen, setInfoPopoverOpen] = useState<boolean>(false);

  const SpaceTypesAvailable = useMemo(() => Object.values(SpaceTypes).filter((spaceType) => spaceType.value !== SpaceTypes.DRAFT.value), []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.KVDBS]);
  }, []);

  const buildQuery = useCallback(() => {
    let query = searchQuery
      ? EuiSearchBar.Query.toESQuery(searchQuery)
      : { match_all: {} };
    if (!query || Object.keys(query).length === 0) {
      query = { match_all: {} };
    }

    // // Add space filter if it is selected
    if (spaceFilter) {
      query = {
        bool: {
          must: [query, { term: { "space.name": spaceFilter } }],
        },
      };
    }

    return query;
  }, [searchQuery, spaceFilter]);

  const fetchKVDBs = useCallback(async () => {
    setLoading(true);
    const sort = sortField
      ? [
          {
            [sortField]: {
              order: sortDirection,
            },
          },
        ]
      : undefined;

    try {
      const response = await DataStore.kvdbs.searchKVDBs({
        from: pageIndex * pageSize,
        size: pageSize,
        sort,
        query: buildQuery(),
        track_total_hits: true,
      });

      setItems(response.items);
      setTotalItemCount(response.total);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, sortField, sortDirection, buildQuery, refreshTick]);

  useEffect(() => {
    fetchKVDBs();
  }, [fetchKVDBs]);

  const onTableChange = ({ page, sort }: any) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }

    if (sort) {
      setSortField(sort.field || KVDBS_SORT_FIELD);
      setSortDirection(sort.direction || "asc");
    }
  };

  const onSearchChange = ({ query }: { query: any }) => {
    setSearchQuery(query);
    setPageIndex(0);
  };

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 50, 100],
    }),
    [pageIndex, pageSize, totalItemCount],
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection],
  );

  const columns: Array<EuiBasicTableColumn<KVDBItem>> = useMemo(
    () => [
      {
        field: "document.title",
        name: "Title",
        sortable: true,
        dataType: "string",
        render: (_value: string, item: KVDBItem) =>
          item.document?.title || DEFAULT_EMPTY_DATA,
      },
      {
        field: "integration.title",
        name: "Integration",
        dataType: "string",
        render: (value: string) => value || DEFAULT_EMPTY_DATA,
      },
      {
        name: "Actions",
        align: "right",
        render: (item: KVDBItem) => (
          <EuiToolTip content="View details">
            <EuiButtonIcon
              iconType="inspect"
              aria-label="View KVDB details"
              onClick={() => setSelectedKVDB(item)}
            />
          </EuiToolTip>
        ),
      },
    ],
    [],
  );

  return (
    <>
      {selectedKVDB && (
        <KVDBDetailsFlyout
          kvdb={selectedKVDB}
          onClose={() => setSelectedKVDB(null)}
        />
      )}
      <EuiFlexGroup direction="column" gutterSize="m">
        <PageHeader>
          <EuiFlexItem>
            <EuiFlexGroup
              gutterSize="s"
              justifyContent="spaceBetween"
              alignItems="center"
            >
              <EuiFlexItem>
                <EuiText size="s">
                  <h1>KVDBs</h1>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      data-test-subj="change-editor-type"
                      legend="This is editor type selector"
                      options={
                        SpaceTypesAvailable.map((spaceType) => ({
                          id: spaceType.value,
                          label: spaceType.label,
                        }))
                      }
                      idSelected={spaceFilter}
                      onChange={(id) => {
                        setSpaceFilter(id);
                        setPageIndex(0);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      button={
                        <EuiButtonIcon
                          iconType="iInCircle"
                          aria-label="Spaces information"
                          onClick={() => setInfoPopoverOpen(!infoPopoverOpen)}
                          color="primary"
                        />
                      }
                      isOpen={infoPopoverOpen}
                      closePopover={() => setInfoPopoverOpen(false)}
                      anchorPosition="downRight"
                    >
                      <div style={{ width: '300px' }}>
                        <EuiText size="s">
                          <strong>Spaces</strong>
                        </EuiText>
                        <EuiSpacer size="s" />
                        {SpaceTypesAvailable.map((spaceType) => (
                          <div key={spaceType.value} style={{ paddingLeft: '16px' }}>
                            <EuiText size="xs">
                              <p>
                                <strong>{spaceType.label}:</strong> {spaceType.description}
                              </p>
                            </EuiText>
                            <EuiSpacer size="s" />
                          </div>
                        ))}
                        <p>
                        <EuiLink 
                          href="https://documentation.wazuh.com/current/user-manual/kvdbs/spaces.html" 
                          target="_blank" 
                          external
                        >
                          <EuiText size="s" className="eui-displayInline">
                          Learn more in the documentation
                        </EuiText>
                        </EuiLink>
                        </p>
                      </div>
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PageHeader>
        <EuiFlexItem>
          <EuiPanel>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiSearchBar
                  box={{
                    placeholder: "Search KVDBs",
                    incremental: true,
                    compressed: true,
                    schema: true,
                  }}
                  schema={KVDBS_SEARCH_SCHEMA}
                  onChange={onSearchChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  iconType="refresh"
                  onClick={() => setRefreshTick((t) => t + 1)}
                >
                  Refresh
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={items}
              columns={columns}
              loading={loading}
              pagination={pagination}
              sorting={sorting}
              onChange={onTableChange}
              itemId={(item) => item.document?.id || item.id}
              noItemsMessage="No KVDBs to display"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
