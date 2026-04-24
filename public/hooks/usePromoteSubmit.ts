/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { DataStore } from '../store/DataStore';
import { errorNotificationToast, successNotificationToast } from '../utils/helpers';
import { PromoteChanges, PromoteSpaces } from '../../types';

interface UsePromoteSubmitOptions {
  space: PromoteSpaces;
  notifications: NotificationsStart;
  onSuccess: () => void;
}

/**
 * Returns an async submitter that calls the promote API with the given
 * changes, surfaces the engine's error message as a toast on failure, and
 * calls `onSuccess` on success. Keeps the container free of DataStore /
 * notifications wiring.
 */
export function usePromoteSubmit({ space, notifications, onSuccess }: UsePromoteSubmitOptions) {
  return useCallback(
    async (changes: PromoteChanges): Promise<boolean> => {
      try {
        const result = await DataStore.integrations.promoteIntegration({ space, changes });
        if (result.ok) {
          successNotificationToast(notifications, 'promoted', `[${space}] space`);
          onSuccess();
        }
        // On failure the store already fired an error toast with the engine
        // message; nothing else to do here.
        return result.ok;
      } catch (error: any) {
        // OSD http client throws on non-2xx; the engine error is usually in
        // error.body.error (not body.message). Check both shapes.
        const message =
          (typeof error?.body === 'string' && error.body) ||
          error?.body?.error ||
          error?.body?.message ||
          error?.message ||
          'Unknown error';
        errorNotificationToast(notifications, 'promote', 'integration', message);
        return false;
      }
    },
    [space, notifications, onSuccess]
  );
}
