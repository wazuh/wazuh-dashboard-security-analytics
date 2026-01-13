/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { HttpSetup } from 'opensearch-dashboards/public';
import { API } from '../../server/utils/constants';
import { ServerResponse } from '../../server/models/types';
import { GetDecoderResponse, SearchDecodersResponse } from '../../types';

export default class DecodersService {
  httpClient: HttpSetup;

  constructor(httpClient: HttpSetup) {
    this.httpClient = httpClient;
  }

  public normalizeSpace(space?: unknown): string | undefined {
    if (!space) {
      return undefined;
    }
    if (typeof space === 'string') {
      return space;
    }
    if (typeof space === 'object') {
      const record = space as Record<string, unknown>;
      if (typeof record.name === 'string') {
        return record.name;
      }
      if (typeof record.id === 'string') {
        return record.id;
      }
      if (typeof record.value === 'string') {
        return record.value;
      }
    }
    return undefined;
  }

  searchDecoders = async (
    body: any,
    space?: string
  ): Promise<ServerResponse<SearchDecodersResponse>> => {
    const url = `..${API.DECODERS_BASE}/_search`;
    const normalizedSpace = this.normalizeSpace(space);
    const query = normalizedSpace ? { space: normalizedSpace } : {};
    return (await this.httpClient.post(url, {
      query,
      body: JSON.stringify(body),
    })) as ServerResponse<SearchDecodersResponse>;
  };

  getDecoder = async (decoderId: string, space?: string): Promise<ServerResponse<GetDecoderResponse>> => {
    const url = `..${API.DECODERS_BASE}/${decoderId}`;
    const normalizedSpace = this.normalizeSpace(space);
    const query = normalizedSpace ? { space: normalizedSpace } : {};
    return (await this.httpClient.get(url, {
      query,
    })) as ServerResponse<GetDecoderResponse>;
  };
}
