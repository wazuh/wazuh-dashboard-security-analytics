/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IOpenSearchDashboardsResponse,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  RequestHandlerContext,
  ResponseError,
} from 'opensearch-dashboards/server';
import { ServerResponse } from '../models/types';
import {
  CreateIntegrationRequestBody,
  CreateIntegrationResponse,
  DeleteIntegrationParams,
  DeleteIntegrationResponse,
  GetPromoteBySpaceResponse,
  IntegrationBase,
  PromoteIntegrationRequestBody,
  PromoteIntegrationResponse,
  PromoteSpaces,
  SearchIntegrationsResponse,
  UpdateIntegrationParams,
  UpdateIntegrationResponse,
} from '../../types';
import { CLIENT_INTEGRATION_METHODS, CONTENT_INDICES } from '../utils/constants';
import { extractErrorMessage } from '../utils/helpers';
import { MDSEnabledClientService } from './MDSEnabledClientService';
import { get, sortBy } from 'lodash';
import { getNextSpace } from '../../common/helpers';

export class IntegrationService extends MDSEnabledClientService {
  createIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, CreateIntegrationRequestBody>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<CreateIntegrationResponse> | ResponseError>
  > => {
    try {
      const { document } = request.body;
      const client = this.getClient(request, context);
      const createIntegrationResponse: CreateIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.CREATE_INTEGRATION,
        { body: { resource: document } }
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: createIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - createIntegration:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  searchIntegrations = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<SearchIntegrationsResponse> | ResponseError>
  > => {
    try {
      const { query, size, _source } = request.body as {
        query?: object;
        size?: number;
        _source?: string[] | boolean;
      };

      const client = this.getClient(request, context);
      const searchIntegrationsResponse: SearchIntegrationsResponse = await client(
        // CLIENT_INTEGRATION_METHODS.SEARCH_INTEGRATIONS,
        'search',
        {
          index: CONTENT_INDICES.INTEGRATIONS,
          body: {
            size: size ?? 10000,
            query: query ?? { match_all: {} },
            ...(_source !== undefined ? { _source } : {}),
          },
        }
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchIntegrationsResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - searchIntegrations:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  updateIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ integrationId: string }, unknown, IntegrationBase>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<UpdateIntegrationResponse> | ResponseError>
  > => {
    try {
      const {
        document: { id, date, modified, ...document },
      } = request.body;
      const { integrationId } = request.params;
      const params: UpdateIntegrationParams = {
        body: { resource: document },
        integrationId,
      };
      const client = this.getClient(request, context);
      const updateIntegrationResponse: UpdateIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.UPDATE_INTEGRATION,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: updateIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - updateIntegration:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  resolvePromoteEntity = async (
    client: any,
    promoteEntityData: { id: string }[],
    {
      index,
      space,
      nameProp,
      idProp,
    }: {
      index: string;
      space: PromoteSpaces;
      nameProp: string;
      idProp: string;
    },
    targetSpace: PromoteSpaces | null = null
  ) => {
    const ids = promoteEntityData.map(({ id }) => id.replace(/^\w_/, '')); // TODO: this removes the `d_` prefix of the ids

    const searchEntityByIdsAndSpace = async (idsToSearch: string[], searchSpace: PromoteSpaces) => {
      if (idsToSearch.length === 0) {
        return {};
      }

      // TODO: This should paginate the results
      const searchResponse: SearchIntegrationsResponse = await client('search', {
        index,
        body: {
          size: 10000,
          _source: [nameProp, idProp],
          query: {
            bool: {
              must: [
                {
                  terms: {
                    [idProp]: idsToSearch,
                  },
                },
                {
                  term: {
                    'space.name': searchSpace,
                  },
                },
              ],
            },
          },
        },
      });

      return Object.fromEntries(
        searchResponse.hits.hits.map(({ _source }) => [
          get(_source, idProp),
          get(_source, nameProp),
        ])
      );
    };

    const entitiesInCurrentSpace = await searchEntityByIdsAndSpace(ids, space);

    if (!targetSpace) {
      return entitiesInCurrentSpace;
    }

    const unresolvedIds = ids.filter((id) => !entitiesInCurrentSpace[id]);
    if (unresolvedIds.length === 0) {
      return entitiesInCurrentSpace;
    }

    const entitiesInTargetSpace = await searchEntityByIdsAndSpace(unresolvedIds, targetSpace);
    return {
      ...entitiesInTargetSpace,
      ...entitiesInCurrentSpace,
    };
  };

  getPromoteBySpace = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ integrationId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<GetPromoteBySpaceResponse> | ResponseError>
  > => {
    try {
      const { space } = request.params;
      const params: { space: string } = { space };
      const client = this.getClient(request, context);
      const promoteSpace: PromoteIntegrationRequestBody = await client(
        CLIENT_INTEGRATION_METHODS.GET_PROMOTE_BY_SPACE,
        params
      );
      const targetSpace = getNextSpace(space);

      const availablePromotions: Record<string, Record<string, string>> = {
        integrations: {},
        decoders: {},
        kvdbs: {},
        filters: {},
        policy: {},
        rules: {},
      };

      //
      if (promoteSpace.changes.integrations.length > 0) {
        availablePromotions['integrations'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.integrations,
          {
            index: CONTENT_INDICES.INTEGRATIONS,
            space,
            nameProp: 'document.metadata.title',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      if (promoteSpace.changes.decoders.length > 0) {
        availablePromotions['decoders'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.decoders,
          {
            index: CONTENT_INDICES.DECODERS,
            space,
            nameProp: 'document.name',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      if (promoteSpace.changes.kvdbs.length > 0) {
        availablePromotions['kvdbs'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.kvdbs,
          {
            index: CONTENT_INDICES.KVDBS,
            space,
            nameProp: 'document.metadata.title',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      if (promoteSpace.changes.filters.length > 0) {
        availablePromotions['filters'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.filters,
          {
            index: CONTENT_INDICES.FILTERS,
            space,
            nameProp: 'document.metadata.title',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      if (promoteSpace.changes.policy.length > 0) {
        availablePromotions['policy'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.policy,
          {
            index: CONTENT_INDICES.POLICIES,
            space,
            nameProp: 'document.metadata.title',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      if (promoteSpace.changes.rules?.length > 0) {
        availablePromotions['rules'] = await this.resolvePromoteEntity(
          client,
          promoteSpace.changes.rules,
          {
            index: CONTENT_INDICES.RULES,
            space,
            nameProp: 'document.metadata.title',
            idProp: 'document.id',
          },
          targetSpace
        );
      }

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: {
            promote: promoteSpace,
            available_promotions: availablePromotions,
          },
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - promoteIntegration:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  promoteIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ integrationId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<PromoteIntegrationResponse> | ResponseError>
  > => {
    try {
      const body = request.body;
      const params: { body: any } = { body };
      const client = this.getClient(request, context);
      const promoteIntegrationResponse: PromoteIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.PROMOTE_INTEGRATION,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: promoteIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - promoteIntegration:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };

  deleteIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ integrationId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<DeleteIntegrationResponse> | ResponseError>
  > => {
    try {
      const { integrationId } = request.params;
      const params: DeleteIntegrationParams = { integrationId };
      const client = this.getClient(request, context);
      const deleteIntegrationResponse: DeleteIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.DELETE_INTEGRATION,
        params
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: deleteIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset management - IntegrationService - deleteIntegration:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };
}
