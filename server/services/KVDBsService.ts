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
  KVDBIntegrationsSearchResponse,
  KVDBSearchRequest,
  KVDBSearchResponse,
  KVDBSpacesResponse,
} from '../../types';
import { MDSEnabledClientService } from './MDSEnabledClientService';

const KVDBS_INDEX = '.cti-kvdbs';
const INTEGRATIONS_INDEX = '.cti-integration-decoders';
const SPACE_FIELD = 'space';
const SPACE_KEYWORD_FIELD = 'space.keyword';
const MAX_SPACE_BUCKETS = 1000;

export class KVDBsService extends MDSEnabledClientService {
  searchKVDBs = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, KVDBSearchRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<KVDBSearchResponse> | ResponseError>> => {
    try {
      const body = request.body ?? { query: { match_all: {} } };
      const client = this.getClient(request, context);
      const searchResponse: KVDBSearchResponse = await client('search', {
        index: KVDBS_INDEX,
        body: JSON.stringify(body),
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
          error: error.message,
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
        index: INTEGRATIONS_INDEX,
        body: JSON.stringify({
          size: kvdbIds.length,
          query: {
            terms: {
              'document.kvdbs': kvdbIds,
            },
          },
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
          error: error.message,
        },
      });
    }
  };

  getSpaces = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<KVDBSpacesResponse> | ResponseError>> => {
    try {
      const client = this.getClient(request, context);
      const fetchSpaces = async (field: string) => {
        const result: any = await client('search', {
          index: KVDBS_INDEX,
          body: JSON.stringify({
            size: 0,
            aggs: {
              spaces: {
                terms: {
                  field,
                  size: MAX_SPACE_BUCKETS,
                },
              },
            },
          }),
        });

        return result?.aggregations?.spaces?.buckets?.map((bucket: any) => bucket.key) ?? [];
      };

      let spaces: string[] = [];
      try {
        spaces = await fetchSpaces(SPACE_KEYWORD_FIELD);
        if (!spaces.length) {
          spaces = await fetchSpaces(SPACE_FIELD);
        }
      } catch (error) {
        spaces = await fetchSpaces(SPACE_FIELD);
      }

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: { spaces },
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - KVDBsService - getSpaces:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.message,
        },
      });
    }
  };
}
