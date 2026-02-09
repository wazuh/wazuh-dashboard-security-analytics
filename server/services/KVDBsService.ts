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
} from "opensearch-dashboards/server";
import { ServerResponse } from "../models/types";
import {
  KVDBIntegrationsSearchResponse,
  KVDBSearchRequest,
  KVDBSearchResponse,
} from "../../types";
import { MDSEnabledClientService } from "./MDSEnabledClientService";

const KVDBS_INDEX = ".cti-kvdbs";
const INTEGRATIONS_INDEX = ".cti-integrations";

export class KVDBsService extends MDSEnabledClientService {
  searchKVDBs = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, KVDBSearchRequest>,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<KVDBSearchResponse> | ResponseError
    >
  > => {
    try {
      const body = request.body ?? { query: { match_all: {} } };
      const client = this.getClient(request, context);
      const searchResponse: KVDBSearchResponse = await client("search", {
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
      console.error("Security Analytics - KVDBsService - searchKVDBs:", error);
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
    request: OpenSearchDashboardsRequest<
      unknown,
      unknown,
      { kvdbIds: string[] }
    >,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<KVDBIntegrationsSearchResponse> | ResponseError
    >
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
      const searchResponse: KVDBIntegrationsSearchResponse = await client(
        "search",
        {
          index: INTEGRATIONS_INDEX,
          body: JSON.stringify({
            size: kvdbIds.length,
            query: {
              terms: {
                "document.kvdbs": kvdbIds,
              },
            },
          }),
        },
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchResponse,
        },
      });
    } catch (error: any) {
      console.error(
        "Security Analytics - KVDBsService - searchIntegrations:",
        error,
      );
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
