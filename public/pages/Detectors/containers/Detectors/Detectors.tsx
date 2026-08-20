/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiBasicTableColumn,
  EuiSmallButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
  EuiSearchBar,
} from '@elastic/eui';
import {
  BREADCRUMBS,
  DEFAULT_EMPTY_DATA,
  ROUTES,
  PAGE_HEADER_CONTROL_STYLE,
} from '../../../../utils/constants';
import DeleteModal from '../../../../components/DeleteModal';
import { getDetectorNames } from '../../utils/helpers';
import {
  capitalizeFirstLetter,
  errorNotificationToast,
  formatRuleType,
  getLogTypeFilterOptionsFlat,
  renderTime,
  setBreadcrumbs,
} from '../../../../utils/helpers';
import { FieldValueSelectionFilterConfigType } from '@elastic/eui/src/components/search_bar/filters/field_value_selection_filter';
import { DetectorsService } from '../../../../services';
import { DetectorHit, DetectorHitWithSpace } from '../../../../../server/models/interfaces';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { Direction } from '@opensearch-project/oui/src/services/sort/sort_direction';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { PageHeader } from '../../../../components/PageHeader/PageHeader';
import { IntegrationCell } from '../../../../components/IntegrationCell/IntegrationCell';
import { getDetectorSourceLabel, isStandardSource } from '../../../../utils/detectorSource'; // Wazuh: import functions to handle detector source and space
import {
  buildQueryTextWithStatus,
  readInMemoryUrlFilterValues,
  splitStatusFromQueryText,
  writeInMemoryUrlFilterValues,
} from '../../../../utils/inMemoryUrlFilterAdapter';
import { buildStatusIntegrationFilters } from '../../../../utils/entitySearchBarFilters';
import { ListEmptyPrompt } from '../../../../components/ListEmptyPrompt';

export interface DetectorsProps extends RouteComponentProps {
  detectorService: DetectorsService;
  notifications: NotificationsStart;
  dataSource: DataSourceOption;
}

interface DetectorsState {
  detectorHits: DetectorHit[];
  loadingDetectors: boolean;
  selectedItems: DetectorHit[];
  isDeleteModalVisible: boolean;
  isPopoverOpen: boolean;
}

// Wazuh: also rendered as a child; appDescriptionControls needs home:useNewHomePage.
const PAGE_DESCRIPTION =
  'A detector connects rules to a data source, an index or an alias, and runs continuously to identify security findings. It uses rules already active in a single space, either custom or standard.';

export default class Detectors extends Component<DetectorsProps, DetectorsState> {
  constructor(props: DetectorsProps) {
    super(props);

    this.state = {
      detectorHits: [],
      loadingDetectors: false,
      selectedItems: [],
      isDeleteModalVisible: false,
      isPopoverOpen: false,
    };
    // Wazuh: query/status/space persisted in the URL (no 'page' — Detectors is an
    // in-memory table, per the no-goal boundary). Guarded: `history` is optional
    // in some existing test mocks that don't pass RouteComponentProps.
    this.urlFilters = readInMemoryUrlFilterValues(props.history?.location?.search ?? '', ['space']);

    // Wazuh: '=' (exact) inside an OR-group matches what the integration filter itself
    // produces on a checkbox click — a plain 'integration:value' token would use the
    // default contains-match operator, reintroducing the substring-match bug
    // fixed earlier for these filters. The `space` note below is about the one-shot
    // `integration` param folding only: `space` is deliberately not applied there
    // (server-side-only, in the count query).
    const search = props.history?.location?.search ?? '';
    this.pendingIntegrationParam = new URLSearchParams(search).get('integration') ?? undefined;
    if (this.pendingIntegrationParam) {
      const value = /\s/.test(this.pendingIntegrationParam)
        ? `"${this.pendingIntegrationParam}"`
        : this.pendingIntegrationParam;
      const token = `integration=(${value})`;
      this.urlFilters = {
        ...this.urlFilters,
        query: [this.urlFilters.query, token].filter(Boolean).join(' ').trim(),
      };
    }
  }

  private urlFilters: { query: string; status: string; space: string };
  private pendingIntegrationParam: string | undefined;

  private onSearchChange = ({ query }: { query: any }) => {
    const { query: withoutStatus, status } = splitStatusFromQueryText(query?.text ?? '', 'status');
    const { query: freeText, status: space } = splitStatusFromQueryText(withoutStatus, 'space');
    if (this.props.history) {
      writeInMemoryUrlFilterValues(this.props.history, { query: freeText, status, space });
    }
    return true;
  };

  async componentDidMount() {
    setBreadcrumbs([BREADCRUMBS.DETECTION, BREADCRUMBS.DETECTORS]);
    if (this.pendingIntegrationParam && this.props.history) {
      writeInMemoryUrlFilterValues(this.props.history, {
        query: this.urlFilters.query,
        status: this.urlFilters.status,
        space: this.urlFilters.space,
      });
      // Wazuh: drop the one-shot `integration` param now that its clause has
      // been folded into `query` — leaving it would re-seed/duplicate the
      // token on every remount.
      const params = new URLSearchParams(this.props.history.location.search);
      params.delete('integration');
      this.props.history.replace({ ...this.props.history.location, search: params.toString() });
      this.pendingIntegrationParam = undefined;
    }
    await this.getDetectors();
  }

  componentDidUpdate(
    prevProps: Readonly<DetectorsProps>,
    prevState: Readonly<DetectorsState>,
    snapshot?: any
  ): void {
    if (this.props.dataSource && prevProps.dataSource !== this.props.dataSource) {
      this.getDetectors();
    }
  }

  getDetectors = async () => {
    this.setState({ loadingDetectors: true });
    const { detectorService, notifications } = this.props;
    try {
      const res = await detectorService.getDetectors();
      if (res.ok) {
        const detectors = res.response.hits.hits.map((detector) => {
          const { custom_rules, pre_packaged_rules } = detector._source.inputs[0].detector_input;
          const rulesCount = custom_rules.length + pre_packaged_rules.length;

          return {
            ...detector,
            detectorName: detector._source.name,
            lastUpdatedTime: detector._source.last_update_time,
            integration: detector._source.detector_type,
            rulesCount: rulesCount,
            status: detector._source.enabled ? 'Active' : 'Inactive',
            space: getDetectorSourceLabel(detector._source.source), // Wazuh: retrieve space from source
            rawSpace: (detector._source.source || '').toLowerCase(),
          };
        });
        this.setState({ detectorHits: detectors });
      } else if (!res.error.includes('no such index')) {
        errorNotificationToast(notifications, 'retrieve', 'detectors', res.error);
      }
    } catch (e: any) {
      errorNotificationToast(notifications, 'retrieve', 'detectors', e);
    }
    this.setState({ loadingDetectors: false });
  };

  openDeleteModal = () => {
    this.setState({ isDeleteModalVisible: true });
  };

  closeDeleteModal = () => {
    this.setState({ isDeleteModalVisible: false });
  };

  toggleDetector = async (detector: DetectorHit, shouldStart: boolean) => {
    this.setState({ loadingDetectors: true });
    const { detectorService, notifications } = this.props;
    try {
      const updateRes = await detectorService.updateDetector(detector._id, {
        ...detector._source,
        enabled: shouldStart,
      });

      if (!updateRes.ok) {
        errorNotificationToast(notifications, 'update', 'detector', updateRes.error);
      }
    } catch (e: any) {
      errorNotificationToast(notifications, 'update', 'detector', e);
    }
    await this.getDetectors();
    const selectedItemIds = new Set(this.state.selectedItems.map(({ _id }) => _id));
    const updatedSelectedItems: DetectorHit[] = this.state.detectorHits.filter((hit) =>
      selectedItemIds.has(hit._id)
    );
    this.setState({ loadingDetectors: false, selectedItems: updatedSelectedItems });
  };

  onClickDelete = async () => {
    this.setState({ loadingDetectors: true });
    const { selectedItems } = this.state;

    for (let item of selectedItems) {
      await this.deleteDetector(item._id);
    }

    this.getDetectors();
    this.setState({ loadingDetectors: false });
  };

  deleteDetector = async (id: string) => {
    const { detectorService, notifications } = this.props;
    try {
      const deleteRes = await detectorService.deleteDetector(id);
      if (!deleteRes.ok) {
        errorNotificationToast(notifications, 'delete', 'detector', deleteRes.error);
      }
    } catch (e: any) {
      errorNotificationToast(notifications, 'delete', 'detector', e);
    }
  };

  onSelectionChange = (selectedItems: DetectorHit[]) => {
    this.setState({ selectedItems: selectedItems });
  };

  openActionsButton = () => {
    const { isPopoverOpen } = this.state;
    this.setState({ isPopoverOpen: !isPopoverOpen });
  };

  closeActionsPopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  showDetectorDetails = (detectorHit: DetectorHit) => {
    this.props.history.push({
      pathname: `${ROUTES.DETECTOR_DETAILS}/${detectorHit._id}`,
      state: { detectorHit },
    });
  };

  getActionItems = (loading: boolean, selectedItems: DetectorHit[]) => {
    const actionItems = [];
    if (selectedItems.length === 1) {
      actionItems.push(
        <EuiContextMenuItem
          key={'ToggleDetector'}
          icon={'empty'}
          disabled={selectedItems.length !== 1 || loading}
          onClick={() => {
            this.closeActionsPopover();
            this.toggleDetector(selectedItems[0], !selectedItems[0]._source.enabled);
          }}
          data-test-subj={'toggleDetectorButton'}
        >
          {`${selectedItems[0]?._source.enabled ? 'Stop' : 'Start'} detector`}
        </EuiContextMenuItem>
      );
    }

    return actionItems;
  };

  render() {
    const { detectorHits, isDeleteModalVisible, isPopoverOpen, loadingDetectors, selectedItems } =
      this.state;

    const actions = [
      <EuiSmallButton
        href={`#${ROUTES.DETECTORS_CREATE}`}
        fill={true}
        data-test-subj={'detectorsCreateButton'}
        iconType="plus"
        iconSide="left"
        iconGap="s"
      >
        Create detector
      </EuiSmallButton>,
    ];

    const columns: EuiBasicTableColumn<DetectorHit>[] = [
      {
        field: 'detectorName',
        name: 'Detector name',
        sortable: true,
        dataType: 'string',
        render: (name: string, item: DetectorHit) => (
          <EuiLink onClick={() => this.showDetectorDetails(item)}>{name}</EuiLink>
        ),
      },
      {
        field: 'status',
        name: 'Status',
        sortable: true,
        dataType: 'string',
        render: (status: string, item: DetectorHit) => (
          <EuiHealth color={item._source.enabled ? 'success' : 'subdued'}>{status}</EuiHealth>
        ),
      },
      {
        field: 'integration',
        name: 'Integration', // replace log type to integration by Wazuh
        sortable: true,
        dataType: 'string',
        render: (integration: string, item: DetectorHit) => {
          const row = item as DetectorHitWithSpace & { rawSpace?: string; integrationId?: string };
          return (
            <IntegrationCell
              name={formatRuleType(integration)}
              integrationId={row.integrationId}
              space={row.rawSpace}
              currentEntity="detectors"
            />
          );
        },
      },
      {
        field: 'space',
        name: 'Space',
        sortable: true,
        dataType: 'string',
      },
      {
        field: 'rulesCount',
        name: 'Active rules',
        sortable: true,
        dataType: 'number',
        align: 'left',
        render: (count: number) => count || DEFAULT_EMPTY_DATA,
      },
      {
        field: 'lastUpdatedTime',
        name: 'Modified',
        sortable: true,
        dataType: 'date',
        render: (last_update_time: number) => renderTime(last_update_time) || DEFAULT_EMPTY_DATA,
      },
    ];

    const statuses = [
      ...new Set(
        detectorHits.map((detector) => (detector._source.enabled ? 'Active' : 'Inactive'))
      ),
    ];

    const renderActionsLeft = (loading: boolean, selectedItems: DetectorHit[]) => {
      const hasStandardSelected = selectedItems.some((item) =>
        isStandardSource(item._source.source)
      );
      return [
        <EuiToolTip
          key={'Delete'}
          content={hasStandardSelected ? 'Only Custom detectors can be deleted.' : undefined}
        >
          <EuiSmallButton
            color={'danger'}
            iconType={'trash'}
            disabled={selectedItems.length === 0 || loading || hasStandardSelected}
            onClick={() => {
              this.closeActionsPopover();
              this.openDeleteModal();
            }}
            data-test-subj={'deleteButton'}
          >
            {selectedItems.length > 0
              ? `Delete ${selectedItems.length} detectors`
              : 'Delete detectors'}
          </EuiSmallButton>
        </EuiToolTip>,
      ];
    };

    const renderActionsRight = () => {
      return [
        <EuiSmallButton
          iconType={'refresh'}
          onClick={this.getDetectors}
          data-test-subj={'detectorsRefreshButton'}
        >
          Refresh
        </EuiSmallButton>,
        <EuiPopover
          id={'detectorsActionsPopover'}
          button={
            <EuiSmallButton
              isLoading={loadingDetectors}
              iconType={'arrowDown'}
              iconSide={'right'}
              disabled={selectedItems.length !== 1}
              onClick={this.openActionsButton}
              data-test-subj={'detectorsActionsButton'}
            >
              Actions
            </EuiSmallButton>
          }
          isOpen={isPopoverOpen}
          closePopover={this.closeActionsPopover}
          panelPaddingSize={'none'}
          anchorPosition={'downLeft'}
          data-test-subj={'detectorsActionsPopover'}
        >
          <EuiContextMenuPanel
            items={this.getActionItems(loadingDetectors, selectedItems)}
            size="s"
          />
        </EuiPopover>,
      ];
    };

    // Wazuh: Unique space labels from loaded detectors
    const spaceOptions = [
      ...new Set(detectorHits.map((detector) => getDetectorSourceLabel(detector._source.source))),
    ]
      .filter((v) => v)
      .sort()
      .map((space) => ({ value: space, name: space }));
    // End Wazuh

    const search = {
      toolsLeft: renderActionsLeft(loadingDetectors, selectedItems),
      toolsRight: renderActionsRight(),
      box: {
        placeholder: 'Search threat detectors',
        schema: true,
        incremental: true,
        compressed: true,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'status',
          name: 'Status',
          compressed: true,
          options: statuses.map((status) => ({
            value: status,
            name: capitalizeFirstLetter(status),
          })),
          multiSelect: 'or',
          // Wazuh: EUI's default 'eq' operator matches by substring ("Active" is
          // contained in "Inactive"), not equality — 'exact' is required so
          // selecting one status option doesn't also match the other.
          operator: 'exact',
        } as FieldValueSelectionFilterConfigType,
        // Wazuh: reuse the shared Rules/Decoders/KVDBs Integration filter builder
        // (default `integration` field) — only the Integration half is used
        // (index 1); Detectors' own Status filter above stays inline/data-derived
        // and must not pick up the helper's Enabled/Disabled semantics.
        // Wazuh: use the flat `{ value, name }` option variant (not the grouped
        // getLogTypeFilterOptions()) so this popover renders as a plain list of
        // names, matching Rules/Decoders/KVDBs exactly.
        buildStatusIntegrationFilters([], false, {
          integrationFilterOptions: getLogTypeFilterOptionsFlat(),
        })[1],
        // Wazuh: Added new filter for space
        {
          type: 'field_value_selection',
          field: 'space',
          name: 'Space',
          compressed: true,
          options: spaceOptions,
          multiSelect: 'or',
          operator: 'exact',
        } as FieldValueSelectionFilterConfigType,
        // End Wazuh
      ],
      // Wazuh: persist query/status/space in the URL (see this.urlFilters / onSearchChange).
      defaultQuery: EuiSearchBar.Query.parse(
        buildQueryTextWithStatus(
          buildQueryTextWithStatus(this.urlFilters.query, this.urlFilters.status, 'status'),
          this.urlFilters.space,
          'space'
        )
      ),
      onChange: this.onSearchChange,
    };

    const sorting: { sort: { field: string; direction: Direction } } = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };
    return (
      <EuiFlexGroup direction="column" gutterSize={'m'}>
        <PageHeader
          appRightControls={actions.map((action) => ({
            renderComponent: action,
          }))}
          appDescriptionControls={[{ description: PAGE_DESCRIPTION }]}
        >
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                <EuiText size="s">
                  {/* Wazuh modification: Changed page title to "Detectors" */}
                  <h1>Detectors</h1>
                </EuiText>
                <EuiText size="s" color="subdued">
                  {PAGE_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem style={PAGE_HEADER_CONTROL_STYLE}>
                <EuiFlexGroup justifyContent="flexEnd">
                  {actions.map((action, idx) => {
                    return (
                      <EuiFlexItem key={idx} grow={false}>
                        {action}
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PageHeader>

        <EuiFlexItem>
          <EuiPanel>
            <EuiInMemoryTable
              items={detectorHits}
              itemId={(item: DetectorHit) => `${item._id}`}
              columns={columns}
              pagination={true}
              sorting={sorting}
              isSelectable={true}
              selection={{ onSelectionChange: this.onSelectionChange }}
              search={search}
              loading={loadingDetectors}
              message={
                loadingDetectors ? undefined : (
                  <ListEmptyPrompt
                    entity="detectors"
                    hasFilters={detectorHits.length > 0}
                    noContentTitle="No detectors yet"
                    emptyBody={<p>Create one to start generating findings from your log data.</p>}
                    actions={[actions[3]]}
                  />
                )
              }
            />
          </EuiPanel>
        </EuiFlexItem>

        {isDeleteModalVisible && (
          <DeleteModal
            closeDeleteModal={this.closeDeleteModal}
            ids={getDetectorNames(selectedItems)}
            onClickDelete={this.onClickDelete}
            type={selectedItems.length > 1 ? 'detectors' : 'detector'}
          />
        )}
      </EuiFlexGroup>
    );
  }
}
