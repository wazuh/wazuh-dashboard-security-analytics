/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import { DecoderItem, SearchDecodersResponse } from '../../types';
import DecodersService from '../services/DecodersService';
import { errorNotificationToast } from '../utils/helpers';

export interface DecodersSearchParams {
  from?: number;
  size?: number;
  sort?: any;
  query?: any;
  _source?: any;
}

export class DecodersStore {
  constructor(private service: DecodersService, private notifications: NotificationsStart) {}

  private normalizeSpace(space: unknown): string | undefined {
    if (!space) {
      return undefined;
    }
    if (typeof space === 'string') {
      return space;
    }
    if (typeof space === 'object') {
      const record = space as Record<string, unknown>;
      if (typeof record.name === 'string') {
        return record.name;
      }
      if (typeof record.id === 'string') {
        return record.id;
      }
      if (typeof record.value === 'string') {
        return record.value;
      }
    }
    return undefined;
  }

  public async searchDecoders(
    params: DecodersSearchParams,
    space?: string
  ): Promise<SearchDecodersResponse> {
    const response = await this.service.searchDecoders(params, space);
    if (!response.ok) {
      if (
        response.error?.includes('index_not_found_exception') ||
        response.error?.includes('no such index')
      ) {
        return { total: 0, items: [] };
      }
      errorNotificationToast(this.notifications, 'retrieve', 'decoders', response.error);
      return { total: 0, items: [] };
    }

    const items: DecoderItem[] = response.response.items.map((item) => ({
      ...item,
      space: this.normalizeSpace(item.space) ?? this.normalizeSpace(item.document?.space),
    }));

    return { ...response.response, items };
  }

  public async getDecoder(decoderId: string, space?: string): Promise<DecoderItem | undefined> {
    const response = await this.service.getDecoder(decoderId, space);
    if (!response.ok) {
      if (
        response.error?.includes('index_not_found_exception') ||
        response.error?.includes('no such index')
      ) {
        return undefined;
      }
      errorNotificationToast(this.notifications, 'retrieve', 'decoder', response.error);
      return undefined;
    }

    const item = response.response.item;
    if (!item) {
      return undefined;
    }

    return {
      ...item,
      space: this.normalizeSpace(item.space) ?? this.normalizeSpace(item.document?.space),
    };
  }

  public async getSpaces(): Promise<string[]> {
    const response = await this.service.getSpaces();
    if (!response.ok) {
      if (
        response.error?.includes('index_not_found_exception') ||
        response.error?.includes('no such index')
      ) {
        return [];
      }
      errorNotificationToast(this.notifications, 'retrieve', 'spaces', response.error);
      return [];
    }

    return response.response.spaces || [];
  }
}
