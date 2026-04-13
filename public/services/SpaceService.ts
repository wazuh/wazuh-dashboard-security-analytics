/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpSetup } from 'opensearch-dashboards/public';
import { API } from '../../server/utils/constants';
import { ServerResponse } from '../../server/models/types';

export default class SpaceService {
  private readonly httpClient: HttpSetup;

  constructor(httpClient: HttpSetup) {
    this.httpClient = httpClient;
  }

  deleteSpace = async (space: string): Promise<ServerResponse<null>> => {
    const url = `..${API.SPACES_BASE}/${space}`;
    return (await this.httpClient.delete(url)) as ServerResponse<null>;
  };
}
