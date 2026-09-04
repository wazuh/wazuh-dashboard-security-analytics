/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import { errorNotificationToast, getErrorMessage } from '../utils/helpers';
import LogTestService from '../services/LogTestService';
import { LogTestApiRequest, LogTestResponse } from '../../types';

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
            ? `The log test event is too large to process. Reduce the event size and try again. ${response.error}`
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
      errorNotificationToast(this.notifications, 'submit', 'Log test', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };
}
