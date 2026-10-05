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
} from 'opensearch-dashboards/server';
import { ServerResponse } from '../models/types';
import { LogTestApiRequest, LogTestResponse } from '../../types';
import { CLIENT_LOG_TEST_METHODS, LOGTEST_ERROR_KIND_BY_STATUS } from '../utils/constants';
import { extractErrorKind, extractErrorMessage } from '../utils/helpers';
import { MDSEnabledClientService } from './MDSEnabledClientService';

export class LogTestService extends MDSEnabledClientService {
  logTest = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, LogTestApiRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<ServerResponse<LogTestResponse> | ResponseError>> => {
    try {
      const { document: rawDocument } = request.body as LogTestApiRequest;
      const rawMeta = rawDocument.metadata;
      const hasMetadata =
        rawMeta &&
        typeof rawMeta === 'object' &&
        !Array.isArray(rawMeta) &&
        Object.keys(rawMeta).length > 0;

      const logTest = {
        ...rawDocument,
        location: rawDocument.location?.trim() || '-',
        metadata: hasMetadata ? rawMeta : {},
      };

      const client = this.getClient(request, context);

      if (logTest.queue === undefined || logTest.queue === null) {
        return response.custom({
          statusCode: 200,
          body: {
            ok: false,
            error: 'Queue is required.',
          },
        });
      }

      if (!logTest.event) {
        return response.custom({
          statusCode: 200,
          body: {
            ok: false,
            error: 'Event is required.',
          },
        });
      }

      if (!logTest.space) {
        return response.custom({
          statusCode: 200,
          body: {
            ok: false,
            error: 'Space is required.',
          },
        });
      }

      const logTestResponse: LogTestResponse = await client(CLIENT_LOG_TEST_METHODS.TEST_LOG, {
        body: logTest,
      });

      return response.custom({
        statusCode: 200,
        body: {
          ok: true,
          response: logTestResponse,
        },
      });
    } catch (error: any) {
      console.error('Ruleset Management - LogTestService - logTest:', error);
      return response.custom({
        statusCode: 200,
        body: {
          ok: false,
          error: extractErrorMessage(error, 'Log test failed due to an unexpected error.'),
          errorKind: extractErrorKind(error, LOGTEST_ERROR_KIND_BY_STATUS),
        },
      });
    }
  };
}
