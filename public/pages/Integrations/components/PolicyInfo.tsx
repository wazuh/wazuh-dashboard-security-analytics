import React from 'react';
import { withGuardAsync } from '../utils/helpers';
import { DataStore } from '../../../store/DataStore';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { DecoderSource, PolicyDocument, Space } from '../../../../types';
import { ButtonSelectRootDecoder } from './RootDecoderRequirement';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';

export const withPolicyGuard: (Component: React.FC) => React.FC = withGuardAsync(
  async ({ space }: { space: Space }) => {
    try {
      const response = await DataStore.policies.searchPolicies(space);

      const policyDocumentData = response.items?.[0]?.document;

      const rootDecoderId = policyDocumentData?.root_decoder;
      let rootDecoder;
      if (rootDecoderId) {
        rootDecoder = await DataStore.decoders.getDecoder(rootDecoderId, space);
      }

      return { ok: !Boolean(policyDocumentData), data: { policyDocumentData, rootDecoder } };
    } catch (error) {
      return { ok: true, data: { error } };
    }
  },
  ({ error }) =>
    error ? <EuiText color="danger">Error loading the policy: {error.message}</EuiText> : null,
  null,
  {
    rerunOn: ({ space }) => [space],
  }
);

export const PolicyInfoCard: React.FC<{}> = withPolicyGuard(
  ({
    policyDocumentData,
    rootDecoder,
    notifications,
    space,
    check,
  }: {
    policyDocumentData: PolicyDocument;
    rootDecoder: DecoderSource;
    notifications: NotificationsStart;
    space: Space;
    check;
  }) => {
    return (
      <EuiPanel paddingSize="s">
        <EuiTitle size="s">
          <h3>Space info</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem>Title: {policyDocumentData.title}</EuiFlexItem>
          <EuiFlexItem>Description: {policyDocumentData.description}</EuiFlexItem>
          <EuiFlexItem>Author: {policyDocumentData.author}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>Documentation: {policyDocumentData.documentation}</EuiFlexItem>
          <EuiFlexItem>References: {policyDocumentData.references.join(', ')}</EuiFlexItem>
          <EuiFlexItem>
            <div style={{ display: 'flex', alignItems: 'center', flexGrow: 0 }}>
              <div style={{ flexGrow: 0 }}>Root decoder: {rootDecoder?.document?.name ?? ''}</div>
              {actionIsAllowedOnSpace(space, SPACE_ACTIONS.DEFINE_ROOT_DECODER) && (
                <ButtonSelectRootDecoder
                  notifications={notifications}
                  space={space}
                  type="icon"
                  buttonProps={{ iconType: 'pencil', 'aria-label': 'Edit root decoder' }}
                  policyDocumentData={policyDocumentData}
                  rootDecoderSource={rootDecoder}
                  onConfirm={check}
                ></ButtonSelectRootDecoder>
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
