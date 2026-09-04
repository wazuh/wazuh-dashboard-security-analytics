/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import { errorNotificationToast, getErrorMessage } from '../utils/helpers';
import LogTestService from '../services/LogTestService';
import { LogTestApiRequest, LogTestResponse } from '../../types';

// Wazuh: the same failure reaches the store from two places. With the default
// server.maxPayloadBytes the dashboard's own HTTP layer rejects the request, so
// core.http rejects the promise; with that limit raised the request reaches the
// indexer, which answers 413 on the envelope as an error kind.
const PAYLOAD_TOO_LARGE_GUIDANCE =
  'The log test event is too large to process. Reduce the event size and try again.';

const readRejectedStatus = (error: unknown): number | undefined => {
  const rejected = error as any;
  const status = rejected?.response?.status ?? rejected?.body?.statusCode;
  return typeof status === 'number' ? status : undefined;
};

export interface LogTestStoreResult {
  success: boolean;
  data?: LogTestResponse;
  error?: string;
}

export class LogTestStore {
  constructor(private service: LogTestService, private notifications: NotificationsStart) {}

  executeLogTest = async (request: LogTestApiRequest): Promise<LogTestStoreResult> => {
    try {
      const response = await this.service.executeLogTest(request);

      if (!response.ok) {
        const message =
          response.errorKind === 'payload-too-large'
            ? `${PAYLOAD_TOO_LARGE_GUIDANCE} ${response.error}`
            : response.error;

        errorNotificationToast(this.notifications, 'execute', 'log test', message);
        return {
          success: false,
          error: message,
        };
      }

      return {
        success: true,
        data: response.response,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        'An unexpected error occurred while running the log test.'
      );
      const message =
        readRejectedStatus(error) === 413
          ? `${PAYLOAD_TOO_LARGE_GUIDANCE} ${errorMessage}`
          : errorMessage;

      errorNotificationToast(this.notifications, 'execute', 'log test', message);
      return {
        success: false,
        error: message,
      };
    }
  };
}
