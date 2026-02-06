/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from 'opensearch-dashboards/public';
import {
  CreateIntegrationResponse,
  DeleteIntegrationResponse,
  GetPromote,
  IntegrationBase,
  PromoteIntegrationRequestBody,
  PromoteIntegrationResponse,
  SearchIntegrationsResponse,
  ServerResponse,
  UpdateIntegrationResponse,
} from '../../types';
import { API } from '../../server/utils/constants';
import { dataSourceInfo } from './utils/constants';

export default class IntegrationService {
  constructor(private httpClient: HttpSetup) {}

  createIntegration = async (integration: IntegrationBase) => {
    const url = `..${API.INTEGRATION_BASE}`;
    const response = (await this.httpClient.post(url, {
      body: JSON.stringify(integration),
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<CreateIntegrationResponse>;

    return response;
  };

  searchIntegrations = async ({
    spaceFilter,
    id,
  }: {
    spaceFilter?: string;
    id?: string;
  }): Promise<ServerResponse<SearchIntegrationsResponse>> => {
    const url = `..${API.INTEGRATION_BASE}/_search`;
    const query = id
      ? {
          terms: { _id: [id] },
        }
      : {
          bool: {
            must: {
              query_string: {
                query: `space.name:${spaceFilter ? spaceFilter : '*'}`,
              },
            },
          },
        };
    const queryString = JSON.stringify(query);
    return (await this.httpClient.post(url, {
      body: queryString,
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<SearchIntegrationsResponse>;
  };

  updateIntegration = async (
    integrationId: string,
    integration: IntegrationBase
  ): Promise<ServerResponse<UpdateIntegrationResponse>> => {
    const url = `..${API.INTEGRATION_BASE}/${integrationId}`;
    const response = (await this.httpClient.put(url, {
      body: JSON.stringify(integration),
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<UpdateIntegrationResponse>;

    return response;
  };

  deleteIntegration = async (
    integrationId: string
  ): Promise<ServerResponse<DeleteIntegrationResponse>> => {
    const url = `..${API.INTEGRATION_BASE}/${integrationId}`;
    return (await this.httpClient.delete(url, {
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<DeleteIntegrationResponse>;
  };

  getPromoteIntegration = async ({
    space,
  }: GetPromote): Promise<ServerResponse<PromoteIntegrationResponse>> => {
    const url = `..${API.INTEGRATION_BASE}/promote/${space}`;
    return (await this.httpClient.get(url, {
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<PromoteIntegrationResponse>;
  };

  promoteIntegration = async (
    data: PromoteIntegrationRequestBody
  ): Promise<ServerResponse<PromoteIntegrationResponse>> => {
    const url = `..${API.INTEGRATION_BASE}/promote`;
    return (await this.httpClient.post(url, {
      body: JSON.stringify(data),
      query: {
        dataSourceId: dataSourceInfo.activeDataSource.id,
      },
    })) as ServerResponse<PromoteIntegrationResponse>;
  };
}
