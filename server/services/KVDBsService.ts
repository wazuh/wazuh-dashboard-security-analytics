/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
  CreateKVDBPayload,
  KVDBIntegrationsSearchResponse,
  KVDBSearchRequest,
  KVDBSearchResponse,
  UpdateKVDBPayload,
} from '../../types';
import { CLIENT_KVDB_METHODS, CONTENT_INDICES } from '../utils/constants';
import { buildYamlBody, extractErrorMessage } from '../utils/helpers';
import { MDSEnabledClientService } from './MDSEnabledClientService';

export class KVDBsService extends MDSEnabledClientService {
  // Wazuh: resolve one or more integration names (multiSelect 'or') to their KVDB
  // ids, space-scoped, via an EXACT terms match on document.metadata.title (a
  // keyword-mapped field). Mirrors WazuhRuleService/DecodersService's equivalent
  // resolvers — same server-side, single-round-trip pattern as the Rules/Decoders
  // Integration filter.
  private async resolveKVDBIdsByIntegrationNames(
    client: any,
    integrationNames: string[] | undefined,
    space: string | undefined
  ): Promise<string[]> {
    const trimmed = (integrationNames ?? []).map((name) => name.trim()).filter(Boolean);
    if (!trimmed.length) return [];

    const must: any[] = [{ terms: { 'document.metadata.title': trimmed } }];
    if (space) {
      must.push({ term: { 'space.name': space } });
    }

    const searchResponse: any = await client('search', {
      index: CONTENT_INDICES.INTEGRATIONS,
      body: {
        size: 10000,
        query: { bool: { must } },
        _source: ['document.kvdbs'],
      },
    });

    const kvdbIds = new Set<string>();
    (searchResponse?.hits?.hits || []).forEach((hit: any) => {
      (hit._source?.document?.kvdbs || []).forEach((kvdbId: string) => kvdbIds.add(kvdbId));
    });
    return Array.from(kvdbIds);
  }

  searchKVDBs = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, KVDBSearchRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<KVDBSearchResponse> | ResponseError>> => {
    try {
      const body = request.body ?? { query: { match_all: {} } };
      const { integrationNames, space, ...searchBody } = body;
      const client = this.getClient(request, context);

      const hasIntegrationFilter = Boolean(integrationNames?.length);
      const query = hasIntegrationFilter
        ? {
            bool: {
              must: [searchBody.query ?? { match_all: {} }],
              filter: [
                {
                  terms: {
                    'document.id': await this.resolveKVDBIdsByIntegrationNames(
                      client,
                      integrationNames,
                      space
                    ),
                  },
                },
              ],
            },
          }
        : searchBody.query;

      const searchResponse: KVDBSearchResponse = await client('search', {
        index: CONTENT_INDICES.KVDBS,
        body: JSON.stringify({ ...searchBody, query }),
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - searchKVDBs:', error);
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
    request: OpenSearchDashboardsRequest<unknown, unknown, { kvdbIds: string[] }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<KVDBIntegrationsSearchResponse> | ResponseError>
  > => {
    try {
      const { kvdbIds } = request.body ?? { kvdbIds: [] };
      if (!kvdbIds.length) {
        return response.custom({
          statusCode: 200,
          body: {
            ok: true,
            response: { hits: { hits: [] } },
          },
        });
      }

      const client = this.getClient(request, context);
      const searchResponse: KVDBIntegrationsSearchResponse = await client('search', {
        index: CONTENT_INDICES.INTEGRATIONS,
        body: JSON.stringify({
          size: kvdbIds.length,
          query: {
            terms: {
              'document.kvdbs': kvdbIds,
            },
          },
          _source: ['document.id', 'document.metadata.title', 'document.kvdbs'],
        }),
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchResponse,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - searchIntegrations:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error),
        },
      });
    }
  };


  createKVDB = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<{ id: string }> | ResponseError>> => {
    try {
      const { resourceYaml, integrationId } = request.body as CreateKVDBPayload;
      if (!resourceYaml) {
        return response.custom({
          statusCode: 200,
          body: { ok: false, error: 'KVDB resource is required' },
        });
      }

      const client = this.getClient(request, context);
      const createResponse = await client(CLIENT_KVDB_METHODS.CREATE_KVDB, {
        body: buildYamlBody(
          resourceYaml,
          integrationId ? { integration: integrationId } : undefined
        ),
        headers: { 'Content-Type': 'application/yaml', Accept: 'application/json' },
      });

      return response.custom({ statusCode: 200, body: { ok: true, response: createResponse } });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - createKVDB:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  updateKVDB = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ kvdbId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<null> | ResponseError>> => {
    try {
      const { kvdbId } = request.params;
      const { resourceYaml } = request.body as UpdateKVDBPayload;
      if (!resourceYaml) {
        return response.custom({
          statusCode: 200,
          body: { ok: false, error: 'KVDB resource is required' },
        });
      }

      const client = this.getClient(request, context);
      const updateResponse = await client(CLIENT_KVDB_METHODS.UPDATE_KVDB, {
        body: buildYamlBody(resourceYaml),
        kvdbId,
        headers: { 'Content-Type': 'application/yaml', Accept: 'application/json' },
      });

      return response.custom({ statusCode: 200, body: { ok: true, response: updateResponse } });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - updateKVDB:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  deleteKVDB = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ kvdbId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<null> | ResponseError>> => {
    try {
      const { kvdbId } = request.params;
      const client = this.getClient(request, context);

      const deleteBody = { kvdbId };

      await client(CLIENT_KVDB_METHODS.DELETE_KVDB, deleteBody);
      // Wazuh: force the index to refresh so the immediate post-delete reload doesn't race OpenSearch's refresh_interval.
      await client('indices.refresh', { index: CONTENT_INDICES.KVDBS });
      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: null,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - deleteKVDB:', error);
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
