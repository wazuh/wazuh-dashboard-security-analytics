import React from 'react';
import { withGuardAsync } from '../utils/helpers';
import { DataStore } from '../../../store/DataStore';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiDescriptionListTitle, EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
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
      <EuiFlexGroup>
    <EuiFlexItem>
        <EuiDescriptionList compressed type="row">
          <EuiDescriptionListTitle>Title</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{policyDocumentData.title}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Description</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{policyDocumentData.description}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Author</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{policyDocumentData.author}</EuiDescriptionListDescription>
        </EuiDescriptionList>
    </EuiFlexItem>
    <EuiFlexItem>
        <EuiDescriptionList compressed type="row">
          <EuiDescriptionListTitle>Documentation</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{policyDocumentData.documentation}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>References</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{policyDocumentData.references.join(', ')}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Root decoder</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
              {rootDecoder?.document?.name ?? ''}
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
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
    );
  }
);
