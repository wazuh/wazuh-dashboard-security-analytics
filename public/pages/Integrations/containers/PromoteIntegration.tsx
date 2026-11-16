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
import { getErrorMessage, setBreadcrumbs, successNotificationToast } from '../../../utils/helpers';
import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { getPromoteChangeName, withGuardAsync } from '../utils/helpers';
import { PromoteBySpaceModal } from '../components/PromoteModal';
import { GetPromoteBySpaceResponse, PromoteChangeGroup, PromoteSpaces } from '../../../../types';
import { SPACE_ACTIONS } from '../../../../common/constants';
import { compose } from 'redux';
import { actionIsAllowedOnSpace, getNextSpace } from '../../../../common/helpers';
import { PromoteChangeDiff } from '../components/PromoteChangeDiff';

export interface PromoteIntegrationProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

const PromoteEntity: React.FC<{
  label: string;
  entity: PromoteChangeGroup;
  data: GetPromoteBySpaceResponse['response'];
  space: PromoteSpaces;
}> = ({ label, entity, data, space }) => {
  const memoizedData = useMemo(
    () =>
      (data.promote?.changes?.[entity] ?? []).map(({ id, ...rest }) => ({
        ...rest,
        id,
        name: getPromoteChangeName(entity, id, data.available_promotions, space as string),
      })),
    [data.promote?.changes?.[entity], entity, data.available_promotions, space]
  );
  return (
    <div>
      <EuiText size="s">
        <h3>{label}</h3>
      </EuiText>
      <EuiSpacer size="s"></EuiSpacer>
      <div>
        {memoizedData.map(({ id, name, operation }, i) => (
          <PromoteChangeDiff key={`${id}-${i}`} name={name || id} operation={operation} />
        ))}
      </div>
    </div>
  );
};

const PromoteBySpace: React.FC<{ space: PromoteSpaces }> = compose(
  withGuardAsync(
    async ({ space }) => {
      try {
        // Get promotions by space
        const [ok, data] = await DataStore.integrations.getPromote({ space });

        if (!ok) {
          return {
            ok: false,
            data: { errorPromote: 'Error getting the promote data' },
          };
        }

        return {
          ok: true,
          data: { promoteData: data },
        };
      } catch (error) {
        return {
          ok: false,
          data: {
            errorPromote: getErrorMessage(error, 'Error getting the promote data'),
          },
        };
      }
    },
    ({
      promoteData,
      space,
      notifications,
      history,
    }: {
      promoteData: GetPromoteBySpaceResponse['response'];
      space: PromoteSpaces;
      notifications: PromoteIntegrationProps['notifications'];
    }) => {
      const [modalIsOpen, setModalIsOpen] = useState(false);

      // TODO: add ability to select which entities to promote
      const hasPromotions = Object.values(promoteData.promote.changes).some(
        (items) => items.length > 0
      );

      if (!hasPromotions) {
        return <EuiText>There is nothing to promote.</EuiText>;
      }

      return (
        <>
          {modalIsOpen && (
            <PromoteBySpaceModal
              closeModal={() => setModalIsOpen(false)}
              promote={promoteData}
              notifications={notifications}
              history={history}
              space={space}
            ></PromoteBySpaceModal>
          )}
          <div>
            {PROMOTE_ENTITIES_ORDER.map((entity) => {
              if ((promoteData?.promote?.changes?.[entity]?.length ?? 0) > 0) {
                const label = PROMOTE_ENTITIES_LABELS[entity];
                return (
                  <React.Fragment key={entity}>
                    <PromoteEntity label={label} entity={entity} data={promoteData} space={space} />
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
              <EuiButton disabled={!hasPromotions} onClick={() => setModalIsOpen(true)} fill={true}>
                Promote
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    },
    EuiLoadingSpinner
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

  const space = new URLSearchParams(location.search).get('space');
  const nextSpace = space ? getNextSpace(space as PromoteSpaces) : null;
  const target = nextSpace ? `the ${nextSpace} space` : 'the next space';
  const description = `Promote the integrations, decoders, KVDBs, filters, rules and space settings to ${target}. Once promoted, they are available in ${target}.`;

  return (
    <EuiPanel>
      <PageHeader appDescriptionControls={[{ description }]}>
        <EuiText size="s">
          {/* Log Type is replaced with Integration by Wazuh */}
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
