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
  ILegacyCustomClusterClient,
} from 'opensearch-dashboards/server';
import { ServerResponse } from '../models/types';
import { CLIENT_SPACE_METHODS } from '../utils/constants';

export class SpaceService {
  constructor(private osDriver: ILegacyCustomClusterClient) {}

  private getClient(request: OpenSearchDashboardsRequest) {
    return this.osDriver.asScoped(request).callAsCurrentUser;
  }

  deleteSpace = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ space: string }>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<null> | ResponseError>> => {
    try {
      const { space } = request.params;
      const client = this.getClient(request);

      await client(CLIENT_SPACE_METHODS.DELETE_SPACE, { space });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: null,
        },
      });
    } catch (error: any) {
      console.error('Security Analytics - SpaceService - deleteSpace:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.body?.message || error.message,
        },
      });
    }
  };
}
