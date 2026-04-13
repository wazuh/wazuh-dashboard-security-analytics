/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import SpaceService from '../services/SpaceService';
import { errorNotificationToast } from '../utils/helpers';

export class SpaceStore {
  constructor(private service: SpaceService, private notifications: NotificationsStart) {}

  public async deleteSpace(space: string): Promise<boolean> {
    const response = await this.service.deleteSpace(space);
    if (!response.ok) {
      errorNotificationToast(this.notifications, 'clear', 'space', response.error);
      return false;
    }
    return true;
  }
}
