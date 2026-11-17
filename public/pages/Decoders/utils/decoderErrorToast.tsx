/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { toMountPoint } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { errorNotificationToast } from '../../../utils/helpers';
import { ParseExpressionErrorToast } from '../components/ParseExpressionErrorToast';
import { parseExpressionError } from './parseExpressionError';

// Longer than the 5 seconds of other error toasts: there is a position to read and a trace to
// open. Hovering the toast pauses it either way.
const PARSE_ERROR_TOAST_LIFE_MS = 10000;

/**
 * Shows a failed decoder create or update. A parser expression the engine rejected gets a short
 * message naming the expression, with the engine's trace behind "Show details"; any other error
 * keeps the usual toast.
 */
export const decoderWriteErrorToast = (
  notifications: NotificationsStart | null,
  actionName: 'create' | 'update',
  error: unknown,
  document: unknown
) => {
  const parseError = parseExpressionError(error, document);
  if (!parseError) {
    errorNotificationToast(notifications, actionName, 'decoder', error);
    return;
  }

  notifications?.toasts.addDanger({
    title: `Failed to ${actionName} decoder:`,
    text: toMountPoint(<ParseExpressionErrorToast error={parseError} details={String(error)} />),
    toastLifeTimeMs: PARSE_ERROR_TOAST_LIFE_MS,
  });
};
