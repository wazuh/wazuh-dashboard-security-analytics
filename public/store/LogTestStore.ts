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
const PAYLOAD_TOO_LARGE = 'The log test event is too large to process.';
const REDUCE_AND_RETRY = 'Reduce the event size and try again.';

const BYTE_UNITS = ['bytes', 'KB', 'MB', 'GB'];

const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // Floor, never round: a limit stated larger than the real one sends the user
  // back to trim an event that was already small enough.
  return `${Math.floor(value * 10) / 10} ${BYTE_UNITS[unit]}`;
};

// Named only for the indexer cap, which is scoped to the log test. The dashboard
// cap, server.maxPayloadBytes, governs every endpoint, so pointing a user at it to
// unblock one screen would recommend a change far wider than the problem. The
// indexer does not send this key, so it is hardcoded until upstream ships it in
// the 413 body.
const INDEXER_LIMIT_SETTING = 'plugins.content_manager.logtest.max_body_bytes';

// Neither rejecting layer reports the limit as a field, only inside its message
// text, so it is read from there. Both known messages carry the byte count as
// their only number; a message that carries none keeps its raw text, so the user
// still learns what happened.
const describePayloadTooLarge = (upstreamMessage: string, limitSetting?: string): string => {
  const [digits] = upstreamMessage.match(/\d+/) ?? [];
  const bytes = Number(digits);
  const raiseIt = limitSetting ? ` To accept larger events, increase ${limitSetting}.` : '';

  return digits && Number.isFinite(bytes) && bytes > 0
    ? `${PAYLOAD_TOO_LARGE} Reduce it below ${formatBytes(bytes)} and try again.${raiseIt}`
    : `${PAYLOAD_TOO_LARGE} ${REDUCE_AND_RETRY}${raiseIt} ${upstreamMessage}`;
};

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
            ? describePayloadTooLarge(response.error, INDEXER_LIMIT_SETTING)
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
        readRejectedStatus(error) === 413 ? describePayloadTooLarge(errorMessage) : errorMessage;

      errorNotificationToast(this.notifications, 'execute', 'log test', message);
      return {
        success: false,
        error: message,
      };
    }
  };
}
