/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import {
  FilterItem,
  FilterSearchRequest,
  FilterSearchResponse,
  ServerResponse,
} from '../../types';
import FiltersService from '../services/FiltersService';
import { errorNotificationToast } from '../utils/helpers';

export class FiltersStore {
  constructor(private service: FiltersService, private notifications: NotificationsStart) {}

  public async searchFilters(
    params: FilterSearchRequest
  ): Promise<{ items: FilterItem[]; total: number }> {
    try {
      const response: ServerResponse<FilterSearchResponse> = await this.service.searchFilters(
        params
      );
      if (!response.ok) {
        errorNotificationToast(this.notifications, 'fetch', 'Filters', response.error);
        return { items: [], total: 0 };
      }

      const hits = response.response.hits.hits ?? [];
      const total =
        typeof response.response.hits.total === 'number'
          ? response.response.hits.total
          : response.response.hits.total?.value ?? hits.length;
      const items: FilterItem[] = hits.map((hit) => ({
        id: hit._id,
        ...hit._source,
      }));

      return { items, total };
    } catch (error: any) {
      errorNotificationToast(this.notifications, 'fetch', 'Filters', error.message);
      return { items: [], total: 0 };
    }
  }
}
