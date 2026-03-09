/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpSetup } from 'opensearch-dashboards/public';
import { FilterSearchRequest, FilterSearchResponse, ServerResponse } from '../../types';
import { API } from '../../server/utils/constants';

export default class FiltersService {
  private readonly baseUrl: string = `..${API.FILTERS_BASE}`;

  constructor(private httpClient: HttpSetup) {}

  searchFilters = async (
    params: FilterSearchRequest
  ): Promise<ServerResponse<FilterSearchResponse>> => {
    const url = `${this.baseUrl}/_search`;
    return (await this.httpClient.post(url, {
      body: JSON.stringify(params ?? {}),
    })) as ServerResponse<FilterSearchResponse>;
  };
}
