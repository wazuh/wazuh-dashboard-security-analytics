/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { successNotificationToast } from '../utils/helpers';

export const DELETE_ACTION = 'delete' as const;
export const DELETE_SELECTED_ACTION = 'delete_selected' as const;

export type DeleteItemForAction =
  | { action: typeof DELETE_ACTION; id: string }
  | { action: typeof DELETE_SELECTED_ACTION };

interface UseDeleteItemsOptions {
  deleteOne: (id: string) => Promise<unknown>;
  reload: () => Promise<void> | void;
  notifications: NotificationsStart;
  entityName: string;
  entityNamePlural: string;
  isMountedRef: MutableRefObject<boolean>;
  /** Fires with the ids whose deleteOne resolved successfully, before reload(). */
  onDeleted?: (deletedIds: string[]) => void;
}

export function useDeleteItems({
  deleteOne,
  reload,
  notifications,
  entityName,
  entityNamePlural,
  isMountedRef,
  onDeleted,
}: UseDeleteItemsOptions) {
  const deleteOneRef = useRef(deleteOne);
  const reloadRef = useRef(reload);
  const onDeletedRef = useRef(onDeleted);
  deleteOneRef.current = deleteOne;
  reloadRef.current = reload;
  onDeletedRef.current = onDeleted;

  const [itemForAction, setItemForAction] = useState<DeleteItemForAction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteSingle = useCallback(async () => {
    if (itemForAction?.action !== DELETE_ACTION || isDeleting) return;
    const { id } = itemForAction;
    setIsDeleting(true);
    try {
      const result = await deleteOneRef.current(id);
      if (result !== undefined) {
        successNotificationToast(notifications, 'deleted', entityName);
        onDeletedRef.current?.([id]);
        await reloadRef.current();
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
        setItemForAction(null);
      }
    }
  }, [itemForAction, isDeleting, notifications, entityName, isMountedRef]);

  const confirmDeleteSelected = useCallback(
    async (selectedItems: Array<{ id: string }>, onSuccess: () => void) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        const deleteResults = await Promise.all(
          selectedItems.map(async (item) => ({
            id: item.id,
            deleted: (await deleteOneRef.current(item.id)) !== undefined,
          }))
        );
        const deletedIds = deleteResults.filter((r) => r.deleted).map((r) => r.id);
        const deletedCount = deletedIds.length;
        const failedCount = deleteResults.length - deletedCount;

        if (deletedCount > 0) {
          successNotificationToast(
            notifications,
            'deleted',
            deletedCount === 1 ? entityName : entityNamePlural
          );
        }

        if (failedCount > 0) {
          notifications.toasts.addWarning({
            title: `Some ${entityNamePlural} could not be deleted`,
            text: `${failedCount} ${
              failedCount !== 1 ? entityNamePlural : entityName
            } could not be deleted.`,
            toastLifeTimeMs: 5000,
          });
        }

        if (deletedIds.length > 0) {
          onDeletedRef.current?.(deletedIds);
        }

        await reloadRef.current();
        if (isMountedRef.current) {
          onSuccess();
        }
      } finally {
        if (isMountedRef.current) {
          setIsDeleting(false);
          setItemForAction(null);
        }
      }
    },
    [isDeleting, notifications, entityName, entityNamePlural, isMountedRef]
  );

  return {
    itemForAction,
    setItemForAction,
    isDeleting,
    confirmDeleteSingle,
    confirmDeleteSelected,
  };
}
