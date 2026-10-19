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
import {
  LogTestApiRequest,
  LogTestDetectionApiRequest,
  LogTestDetectionResult,
  LogTestNormalizationApiRequest,
  LogTestNormalizationRequestBody,
  LogTestNormalizationResult,
  LogTestResponse,
} from '../../types';
import { CLIENT_LOG_TEST_METHODS, LOGTEST_ERROR_KIND_BY_STATUS } from '../utils/constants';
import { extractErrorKind, extractErrorMessage } from '../utils/helpers';
import { MDSEnabledClientService } from './MDSEnabledClientService';

type LogTestRouteResponse = Promise<
  IOpenSearchDashboardsResponse<ServerResponse<LogTestResponse> | ResponseError>
>;

/** Defaults the location and drops an empty metadata object, as the Engine expects. */
const prepareRawEvent = <T extends LogTestNormalizationRequestBody>(rawDocument: T): T => {
  const rawMeta = rawDocument.metadata;
  const hasMetadata =
    rawMeta &&
    typeof rawMeta === 'object' &&
    !Array.isArray(rawMeta) &&
    Object.keys(rawMeta).length > 0;

  return {
    ...rawDocument,
    location: rawDocument.location?.trim() || '-',
    metadata: hasMetadata ? rawMeta : {},
  };
};

/** The first missing required field of a raw event, as the message to show. */
const findMissingRawEventField = (
  document: LogTestNormalizationRequestBody
): string | undefined => {
  if (document.queue === undefined || document.queue === null) return 'Queue is required.';
  if (!document.event) return 'Event is required.';
  if (!document.space) return 'Space is required.';
  return undefined;
};

export class LogTestService extends MDSEnabledClientService {
  private ok(response: OpenSearchDashboardsResponseFactory, body: LogTestResponse) {
    return response.custom({ statusCode: 200, body: { ok: true, response: body } });
  }

  private fail(response: OpenSearchDashboardsResponseFactory, error: string, errorKind?: string) {
    return response.custom({ statusCode: 200, body: { ok: false, error, errorKind } });
  }

  private failFromError(
    response: OpenSearchDashboardsResponseFactory,
    error: any,
    fallback: string
  ) {
    return this.fail(
      response,
      extractErrorMessage(error, fallback),
      extractErrorKind(error, LOGTEST_ERROR_KIND_BY_STATUS)
    );
  }

  logTest = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, LogTestApiRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): LogTestRouteResponse => {
    try {
      const logTest = prepareRawEvent((request.body as LogTestApiRequest).document);
      const missing = findMissingRawEventField(logTest);
      if (missing) return this.fail(response, missing);

      const client = this.getClient(request, context);
      const logTestResponse: LogTestResponse = await client(CLIENT_LOG_TEST_METHODS.TEST_LOG, {
        body: logTest,
      });

      return this.ok(response, logTestResponse);
    } catch (error: any) {
      console.error('Ruleset Management - LogTestService - logTest:', error);
      return this.failFromError(response, error, 'Log test failed due to an unexpected error.');
    }
  };

  /**
   * Wazuh: the Engine-only half. Its answer carries the normalization result as the
   * whole `message`, so it is wrapped into the combined shape, and the page renders
   * both scopes off one type.
   */
  normalization = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, LogTestNormalizationApiRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): LogTestRouteResponse => {
    try {
      const logTest = prepareRawEvent((request.body as LogTestNormalizationApiRequest).document);
      const missing = findMissingRawEventField(logTest);
      if (missing) return this.fail(response, missing);

      const client = this.getClient(request, context);
      const engineResponse: {
        status: string;
        message: LogTestNormalizationResult;
      } = await client(CLIENT_LOG_TEST_METHODS.TEST_LOG_NORMALIZATION, { body: logTest });

      return this.ok(response, {
        status: engineResponse?.status,
        message: { normalization: engineResponse?.message },
      });
    } catch (error: any) {
      console.error('Ruleset Management - LogTestService - normalization:', error);
      // Wazuh: the combined endpoint reports an Engine failure inline, as a
      // normalization error, while this one answers 400 (for example "The 'test'
      // environment does not exist."). Reporting it the same way lets the result view
      // explain it in place instead of in a toast that disappears.
      if (error?.statusCode === 400) {
        return this.ok(response, {
          status: '400',
          message: {
            normalization: {
              status: 'error',
              error: {
                message: extractErrorMessage(error, 'Normalization failed.'),
                code: 'ENGINE_ERROR',
              },
            },
          },
        });
      }
      return this.failFromError(
        response,
        error,
        'Normalization failed due to an unexpected error.'
      );
    }
  };

  /** Wazuh: the rules-only half. It never reaches the Engine. */
  detection = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest<unknown, unknown, LogTestDetectionApiRequest>,
    response: OpenSearchDashboardsResponseFactory
  ): LogTestRouteResponse => {
    try {
      const { space, integration, input } = (request.body as LogTestDetectionApiRequest).document;
      if (!space) return this.fail(response, 'Space is required.');
      if (!integration) return this.fail(response, 'Integration is required.');

      const client = this.getClient(request, context);
      const detectionResponse: {
        status: string;
        message: LogTestDetectionResult;
      } = await client(CLIENT_LOG_TEST_METHODS.TEST_LOG_DETECTION, {
        body: { space, integration, input },
      });

      return this.ok(response, {
        status: detectionResponse?.status,
        message: { detection: detectionResponse?.message },
      });
    } catch (error: any) {
      console.error('Ruleset Management - LogTestService - detection:', error);
      return this.failFromError(response, error, 'Detection failed due to an unexpected error.');
    }
  };
}
