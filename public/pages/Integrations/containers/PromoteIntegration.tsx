/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  BREADCRUMBS,
  PROMOTE_ENTITIES_LABELS,
  PROMOTE_ENTITIES_ORDER,
  ROUTES,
} from '../../../utils/constants';
import { DataStore } from '../../../store/DataStore';
import { setBreadcrumbs } from '../../../utils/helpers';
import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { withGuardAsync } from '../utils/helpers';
import { PromoteBySpaceModal } from '../components/PromoteModal';
import { InconsistenciesCallout } from '../components/InconsistenciesCallout';
import { GetPromoteBySpaceResponse, PromoteChangeGroup, PromoteSpaces } from '../../../../types';
import { SPACE_ACTIONS } from '../../../../common/constants';
import { compose } from 'redux';
import {
  withConditionalHOC,
  withRootDecoderRequirementGuard,
} from '../components/RootDecoderRequirement';
import { actionIsAllowedOnSpace, getNextSpace } from '../../../../common/helpers';
import { PromoteChangeDiff } from '../components/PromoteChangeDiff';
import {
  MANDATORY_PROMOTE_ENTITIES,
  usePromoteSelection,
} from '../../../hooks/usePromoteSelection';
import {
  IntegrationChildrenMap,
  usePromoteInconsistencies,
} from '../../../hooks/usePromoteInconsistencies';
import { usePromoteSubmit } from '../../../hooks/usePromoteSubmit';

export interface PromoteIntegrationProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

const PromoteEntity: React.FC<{
  label: string;
  entity: PromoteChangeGroup;
  data: GetPromoteBySpaceResponse['response'];
  selectedIds: Set<string>;
  onToggleItem: (entity: PromoteChangeGroup, id: string) => void;
  onToggleAll: (entity: PromoteChangeGroup) => void;
  mandatory?: boolean;
}> = ({ label, entity, data, selectedIds, onToggleItem, onToggleAll, mandatory }) => {
  const memoizedData = useMemo(
    () =>
      (data.promote?.changes?.[entity] ?? []).map(({ id, ...rest }) => {
        const strippedId = id.replace(/^\w_/, '');
        const available = data.available_promotions?.[entity];
        const name = available?.[id] ?? available?.[strippedId] ?? id;
        return { ...rest, id, name };
      }),
    [data.promote?.changes?.[entity], entity, data.available_promotions]
  );

  if (mandatory) {
    return (
      <div>
        <EuiText size="s">
          <h3>{label}</h3>
        </EuiText>
        <EuiSpacer size="s" />
        <div>
          {memoizedData.map(({ id, name, operation }, i) => (
            <PromoteChangeDiff key={`${id}-${i}`} name={name || id} operation={operation} />
          ))}
        </div>
      </div>
    );
  }

  const allSelected =
    memoizedData.length > 0 && memoizedData.every(({ id }) => selectedIds.has(id));
  const someSelected = memoizedData.some(({ id }) => selectedIds.has(id));

  return (
    <div>
      <EuiCheckbox
        id={`promote-toggle-all-${entity}`}
        checked={allSelected}
        indeterminate={!allSelected && someSelected}
        onChange={() => onToggleAll(entity)}
        label={
          <EuiText size="s">
            <h3>{label}</h3>
          </EuiText>
        }
      />
      <EuiSpacer size="s" />
      <div style={{ marginLeft: '1.5rem' }}>
        {memoizedData.map(({ id, name, operation }, i) => (
          <EuiCheckbox
            key={`${entity}-${id}-${i}`}
            id={`promote-item-${entity}-${id}-${i}`}
            checked={selectedIds.has(id)}
            onChange={() => onToggleItem(entity, id)}
            label={<PromoteChangeDiff name={name || id} operation={operation} />}
          />
        ))}
      </div>
    </div>
  );
};

const PromoteBySpace: React.FC<{ space: PromoteSpaces }> = compose(
  withConditionalHOC((props) => {
    return actionIsAllowedOnSpace(props.space, SPACE_ACTIONS.DEFINE_ROOT_DECODER);
  }, withRootDecoderRequirementGuard),
  withGuardAsync(
    async ({ space }) => {
      try {
        const [ok, data] = await DataStore.integrations.getPromote({ space });

        if (!ok) {
          return {
            ok: false,
            data: { errorPromote: 'Error getting the promote data' },
          };
        }

        const integrationIds = (data.promote?.changes?.integrations ?? []).map((item) => item.id);
        const integrationChildren = await DataStore.integrations.getIntegrationChildrenMap(
          space,
          integrationIds
        );

        return {
          ok: true,
          data: { promoteData: data, integrationChildren },
        };
      } catch (error) {
        return {
          ok: false,
          data: {
            errorPromote: error.message || 'Error getting the promote data',
          },
        };
      }
    },
    ({
      promoteData,
      integrationChildren,
      space,
      notifications,
      history,
    }: {
      promoteData: GetPromoteBySpaceResponse['response'];
      integrationChildren: IntegrationChildrenMap;
      space: PromoteSpaces;
      notifications: PromoteIntegrationProps['notifications'];
    }) => {
      const [modalIsOpen, setModalIsOpen] = useState(false);

      const {
        selected,
        toggleItem,
        toggleAll,
        selectAllGlobal,
        deselectAllGlobal,
        selectedChanges,
        selectedPromoteData,
        hasPromotions,
        hasSelected,
      } = usePromoteSelection(promoteData);

      const inconsistencies = usePromoteInconsistencies(promoteData, selected, integrationChildren);

      const submitPromote = usePromoteSubmit({
        space,
        notifications,
        onSuccess: () => history.push(ROUTES.INTEGRATIONS),
      });

      if (!hasPromotions) {
        return <EuiText>There is nothing to promote.</EuiText>;
      }

      return (
        <>
          {modalIsOpen && (
            <PromoteBySpaceModal
              closeModal={() => setModalIsOpen(false)}
              promote={selectedPromoteData}
              onConfirm={() => submitPromote(selectedChanges)}
              space={space}
              inconsistencies={inconsistencies}
            />
          )}
          <InconsistenciesCallout inconsistencies={inconsistencies} />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={selectAllGlobal}>
                Select all
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={deselectAllGlobal}>
                Deselect all
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <div>
            {PROMOTE_ENTITIES_ORDER.map((entityKey) => {
              const entity = entityKey as PromoteChangeGroup;
              if ((promoteData?.promote?.changes?.[entity]?.length ?? 0) > 0) {
                const label = PROMOTE_ENTITIES_LABELS[entity];
                return (
                  <React.Fragment key={entity}>
                    <PromoteEntity
                      label={label}
                      entity={entity}
                      data={promoteData}
                      selectedIds={selected[entity] ?? new Set<string>()}
                      onToggleItem={toggleItem}
                      onToggleAll={toggleAll}
                      mandatory={MANDATORY_PROMOTE_ENTITIES.has(entity)}
                    />
                    <EuiSpacer size="m" />
                  </React.Fragment>
                );
              }
              return null;
            })}
          </div>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton disabled={!hasSelected} onClick={() => setModalIsOpen(true)} fill={true}>
                Promote
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    },
    EuiLoadingSpinner,
    {}
  )
)(({ errorPromote }) => {
  return <EuiText color="danger">{errorPromote}</EuiText>;
});

export const PromoteIntegration: React.FC<PromoteIntegrationProps> = ({
  history,
  notifications,
  location,
}) => {
  setBreadcrumbs([BREADCRUMBS.INTEGRATIONS, BREADCRUMBS.PROMOTE]);

  const description =
    'Promote the integrations, decoders and KVDBs, filters, rules and space changes to another space. Once promoted, they will be available in the another space.';

  const space = new URLSearchParams(location.search).get('space');

  return (
    <EuiPanel>
      <PageHeader appDescriptionControls={[{ description }]}>
        <EuiText size="s">
          <h1>Promote</h1>
        </EuiText>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
        <EuiSpacer />
      </PageHeader>
      {actionIsAllowedOnSpace(space, SPACE_ACTIONS.PROMOTE) ? (
        <>
          <EuiText size="s">
            You are promoting the entities from <b>{space}</b> to <b>{getNextSpace(space)}</b>{' '}
            space.
          </EuiText>
          <EuiSpacer />
          <PromoteBySpace
            space={space as PromoteSpaces}
            history={history}
            notifications={notifications}
          />
        </>
      ) : (
        <EuiText size="s" color="danger">
          Invalid space for promotion: {space}
        </EuiText>
      )}
    </EuiPanel>
  );
};
