/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from "opensearch-dashboards/public";
import {
  KVDBIntegrationsSearchResponse,
  KVDBSearchRequest,
  KVDBSearchResponse,
  ServerResponse,
} from "../../types";
import { API } from "../../server/utils/constants";

export default class KVDBsService {
  constructor(private httpClient: HttpSetup) {}

  searchKVDBs = async (
    params: KVDBSearchRequest,
  ): Promise<ServerResponse<KVDBSearchResponse>> => {
    const url = `..${API.KVDBS_BASE}/_search`;
    return (await this.httpClient.post(url, {
      body: JSON.stringify(params ?? {}),
    })) as ServerResponse<KVDBSearchResponse>;
  };

  searchIntegrations = async (
    kvdbIds: string[],
  ): Promise<ServerResponse<KVDBIntegrationsSearchResponse>> => {
    const url = `..${API.KVDBS_BASE}/_integrations`;
    return (await this.httpClient.post(url, {
      body: JSON.stringify({ kvdbIds }),
    })) as ServerResponse<KVDBIntegrationsSearchResponse>;
  };
}
