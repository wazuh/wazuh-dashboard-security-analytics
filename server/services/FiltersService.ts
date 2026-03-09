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
import { FilterSearchRequest, FilterSearchResponse } from '../../types';
import { MDSEnabledClientService } from './MDSEnabledClientService';

const FILTERS_INDEX = '.engine-filters';

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
        index: FILTERS_INDEX,
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
      console.error('Security Analytics - FiltersService - searchFilters:', error);
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
