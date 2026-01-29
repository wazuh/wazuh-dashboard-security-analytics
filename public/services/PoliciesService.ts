/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { HttpSetup } from 'opensearch-dashboards/public';
import { API } from '../../server/utils/constants';
import { ServerResponse } from '../../server/models/types';
import { GetPolicyResponse, SearchPoliciesResponse } from '../../types';

export default class PoliciesService {
  httpClient: HttpSetup;

  constructor(httpClient: HttpSetup) {
    this.httpClient = httpClient;
  }


  searchPolicies = async (
    space: string
  ): Promise<ServerResponse<SearchPoliciesResponse>> => {
    const url = `..${API.POLICIES_BASE}/_search`;
    
    const query = { space };
    return (await this.httpClient.post(url, {
      query,
    })) as ServerResponse<SearchPoliciesResponse>;
  };

  getPolicy = async (policyId: string): Promise<ServerResponse<GetPolicyResponse>> => {
    const url = `..${API.POLICIES_BASE}/${policyId}`;
    
    return (await this.httpClient.get(url, {
    })) as ServerResponse<GetPolicyResponse>;
  };
}
