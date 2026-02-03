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
} from "opensearch-dashboards/server";
import { ServerResponse } from "../models/types";
import {
  CreateIntegrationRequestBody,
  CreateIntegrationResponse,
  DeleteIntegrationParams,
  DeleteIntegrationResponse,
  IntegrationBase,
  SearchIntegrationsResponse,
  UpdateIntegrationParams,
  UpdateIntegrationResponse,
} from "../../types";
import { CLIENT_INTEGRATION_METHODS } from "../utils/constants";
import { MDSEnabledClientService } from "./MDSEnabledClientService";

const INTEGRATIONS_INDEX = ".cti-integrations";

export class IntegrationService extends MDSEnabledClientService {
  createIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<
      unknown,
      unknown,
      CreateIntegrationRequestBody
    >,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<CreateIntegrationResponse> | ResponseError
    >
  > => {
    try {
      const integration = request.body;
      const client = this.getClient(request, context);
      const createIntegrationResponse: CreateIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.CREATE_INTEGRATION,
        { body: { resource: integration.document, type: "integration" } },
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: createIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error(
        "Security Analytics - IntegrationService - createIntegration:",
        error,
      );
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.body || error.message,
        },
      });
    }
  };

  searchIntegrations = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<SearchIntegrationsResponse> | ResponseError
    >
  > => {
    try {
      const query = request.body;
      const client = this.getClient(request, context);
      const searchIntegrationsResponse: SearchIntegrationsResponse =
        await client(
          // CLIENT_INTEGRATION_METHODS.SEARCH_INTEGRATIONS,
          "search",
          {
            index: INTEGRATIONS_INDEX,
            body: {
              size: 10000,
              // query: query ?? {
              query: query ?? {
                match_all: {},
              },
            },
          },
        );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: searchIntegrationsResponse,
        },
      });
    } catch (error: any) {
      console.error(
        "Security Analytics - IntegrationService - searchIntegrations:",
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

  updateIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<
      { integrationId: string },
      unknown,
      IntegrationBase
    >,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<UpdateIntegrationResponse> | ResponseError
    >
  > => {
    try {
      const integration = request.body;
      const { integrationId } = request.params;
      const params: UpdateIntegrationParams = {
        body: integration,
        integrationId,
      };
      const client = this.getClient(request, context);
      const updateIntegrationResponse: UpdateIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.UPDATE_INTEGRATION,
        params,
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: updateIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error(
        "Security Analytics - IntegrationService - updateIntegration:",
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

  deleteIntegration = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<{ integrationId: string }>,
    response: OpenSearchDashboardsResponseFactory,
  ): Promise<
    IOpenSearchDashboardsResponse<
      ServerResponse<DeleteIntegrationResponse> | ResponseError
    >
  > => {
    try {
      const { integrationId } = request.params;
      const params: DeleteIntegrationParams = { integrationId };
      const client = this.getClient(request, context);
      const deleteIntegrationResponse: DeleteIntegrationResponse = await client(
        CLIENT_INTEGRATION_METHODS.DELETE_INTEGRATION,
        params,
      );

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: deleteIntegrationResponse,
        },
      });
    } catch (error: any) {
      console.error(
        "Security Analytics - IntegrationService - deleteIntegration:",
        error,
      );
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: error.body || error.message,
        },
      });
    }
  };
}
