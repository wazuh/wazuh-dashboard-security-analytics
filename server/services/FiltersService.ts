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
  FilterSearchRequest,
  FilterSearchResponse,
  CreateFilterPayload,
  UpdateFilterPayload,
  CUDFilterResponse,
} from '../../types';
import { MDSEnabledClientService } from './MDSEnabledClientService';
import { CLIENT_FILTER_METHODS, CONTENT_INDICES } from '../utils/constants';
import { buildYamlBody, extractErrorMessage } from '../utils/helpers';

export class FiltersService extends MDSEnabledClientService {
  searchFilters = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, FilterSearchRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<
    IOpenSearchDashboardsResponse<ServerResponse<FilterSearchResponse> | ResponseError>
  > => {
    try {
      const body = request.body ?? { query: { match_all: {} } };
      const client = this.getClient(request, context);
      const searchResponse: FilterSearchResponse = await client('search', {
        index: CONTENT_INDICES.FILTERS,
        body: JSON.stringify(body),
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchResponse,
        },
      });
    } catch (error) {
      console.error('Ruleset management - FiltersService - searchFilters:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.message,
        },
      });
    }
  };

  createFilter = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<CUDFilterResponse> | ResponseError>> => {
    try {
      const { resourceYaml, space } = request.body as CreateFilterPayload;
      const client = this.getClient(request, context);
      const createResponse = await client(CLIENT_FILTER_METHODS.CREATE_FILTER, {
        body: buildYamlBody(resourceYaml, { space: space }),
        headers: { 'Content-Type': 'application/yaml', Accept: 'application/json' },
      });
      return response.custom({ statusCode: 200, body: { ok: true, response: createResponse } });
    } catch (error) {
      console.error('Ruleset management - FiltersService - createFilter:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  updateFilter = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ filterId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<CUDFilterResponse> | ResponseError>> => {
    try {
      const { filterId } = request.params;
      const { resourceYaml, space } = request.body as UpdateFilterPayload;
      const client = this.getClient(request, context);
      const updateResponse = await client(CLIENT_FILTER_METHODS.UPDATE_FILTER, {
        filterId,
        body: buildYamlBody(resourceYaml, { space: space }),
        headers: { 'Content-Type': 'application/yaml', Accept: 'application/json' },
      });
      return response.custom({ statusCode: 200, body: { ok: true, response: updateResponse } });
    } catch (error) {
      console.error('Ruleset management - FiltersService - updateFilter:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: extractErrorMessage(error) },
      });
    }
  };

  deleteFilter = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ filterId: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<CUDFilterResponse> | ResponseError>> => {
    try {
      const { filterId } = request.params;
      const client = this.getClient(request, context);
      await client(CLIENT_FILTER_METHODS.DELETE_FILTER, { filterId });
      // Wazuh: force the index to refresh so the immediate post-delete reload doesn't race OpenSearch's refresh_interval.
      await client('indices.refresh', { index: CONTENT_INDICES.FILTERS });
      return response.custom({ statusCode: 200, body: { ok: true, response: null } });
    } catch (error) {
      console.error('Ruleset management - FiltersService - deleteFilter:', error);
      return response.custom({
        statusCode: 200,
        body: { ok: false, error: error.message },
      });
    }
  };
}
