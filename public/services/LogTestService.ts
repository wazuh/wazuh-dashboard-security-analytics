/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpSetup } from 'opensearch-dashboards/public';
import {
  LogTestApiRequest,
  LogTestDetectionApiRequest,
  LogTestNormalizationApiRequest,
  LogTestServerResponse,
} from '../../types';
import { API } from '../../server/utils/constants';

export default class LogTestService {
  constructor(private httpClient: HttpSetup) {}

  private post = async (url: string, params: unknown): Promise<LogTestServerResponse> =>
    (await this.httpClient.post(url, {
      body: JSON.stringify(params),
    })) as LogTestServerResponse;

  executeLogTest = (params: LogTestApiRequest) => this.post(API.LOG_TEST_BASE, params);

  executeNormalization = (params: LogTestNormalizationApiRequest) =>
    this.post(API.LOG_TEST_NORMALIZATION, params);

  executeDetection = (params: LogTestDetectionApiRequest) =>
    this.post(API.LOG_TEST_DETECTION, params);
}
