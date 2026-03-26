/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wazuh modification: deviates from upstream OpenSearch — log type lifecycle field `source`
 * renamed to `space` (indexer/API alignment; see wazuh-dashboard-plugins#8240).
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import { LogType, LogTypeBase, LogTypeWithRules, RuleItemInfoBase } from '../../types';
import LogTypeService from '../services/LogTypeService';
import { errorNotificationToast } from '../utils/helpers';
import { DataStore } from './DataStore';
import { ruleTypes } from '../pages/Rules/utils/constants';
import {
  DATA_SOURCE_NOT_SET_ERROR,
  logTypeCategories,
  logTypesByCategories,
} from '../utils/constants';
import { getLogTypeLabel } from '../pages/LogTypes/utils/helpers';

/** Maps indexer hits to {@link LogType}; supports legacy `source` field (renamed to `space`). */
function mapLogTypeFromHit(hit: {
  _id: string;
  _source: LogTypeBase & { source?: string };
}): LogType {
  const src = hit._source;
  const { source: legacySource, ...rest } = src;
  const rawLifecycle = rest.space ?? legacySource ?? '';
  const space = rawLifecycle.toLowerCase() === 'sigma' ? 'Standard' : rawLifecycle;
  return {
    id: hit._id,
    ...rest,
    space,
  };
}

export class LogTypeStore {
  constructor(private service: LogTypeService, private notifications: NotificationsStart) {}

  public async getLogType(id: string): Promise<LogTypeWithRules | undefined> {
    const logTypesRes = await this.service.searchLogTypes(id);
    if (logTypesRes.ok) {
      const logTypes: LogType[] = logTypesRes.response.hits.hits.map((hit) => mapLogTypeFromHit(hit));

      let detectionRules: RuleItemInfoBase[] = [];

      if (logTypes[0]) {
        const logTypeName = logTypes[0].name.toLowerCase();
        detectionRules = await DataStore.rules.getAllRules({
          'rule.category': [logTypeName],
        });
      }

      return { ...logTypes[0], detectionRules };
    }

    return undefined;
  }

  public async getLogTypes(): Promise<LogType[]> {
    try {
      const logTypesRes = await this.service.searchLogTypes();
      if (logTypesRes.ok) {
        const logTypes: LogType[] = logTypesRes.response.hits.hits.map((hit) => mapLogTypeFromHit(hit));

        ruleTypes.splice(
          0,
          ruleTypes.length,
          ...logTypes
            .map(({ category, id, name, space }) => ({
              label: getLogTypeLabel(name),
              value: name,
              id,
              category,
              isStandard: space === 'Standard',
            }))
            .sort((a, b) => {
              return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
            })
        );

        // Set log category types
        for (const key in logTypesByCategories) {
          delete logTypesByCategories[key];
        }
        logTypes.forEach((logType) => {
          logTypesByCategories[logType.category] = logTypesByCategories[logType.category] || [];
          logTypesByCategories[logType.category].push(logType);
        });
        logTypeCategories.splice(
          0,
          logTypeCategories.length,
          ...Object.keys(logTypesByCategories).sort((a, b) => {
            if (a === 'Other') {
              return 1;
            } else if (b === 'Other') {
              return -1;
            } else {
              return a < b ? -1 : a > b ? 1 : 0;
            }
          })
        );

        return logTypes;
      }

      return [];
    } catch (error: any) {
      if (error.message === DATA_SOURCE_NOT_SET_ERROR) {
        errorNotificationToast(
          this.notifications,
          'Fetch',
          'Log types',
          'Select valid data source.'
        );
        return [];
      }

      throw error;
    }
  }

  public async createLogType(logType: LogTypeBase): Promise<boolean> {
    const createRes = await this.service.createLogType(logType);

    if (!createRes.ok) {
      errorNotificationToast(this.notifications, 'create', 'log type', createRes.error);
    }

    return createRes.ok;
  }

  public async updateLogType({
    category,
    id,
    name,
    description,
    space,
    tags,
  }: LogType): Promise<boolean> {
    const updateRes = await this.service.updateLogType(id, {
      name,
      description,
      space,
      tags,
      category,
    });

    if (!updateRes.ok) {
      errorNotificationToast(this.notifications, 'update', 'log type', updateRes.error);
    }

    return updateRes.ok;
  }

  public async deleteLogType(id: string) {
    const deleteRes = await this.service.deleteLogType(id);
    if (!deleteRes.ok) {
      errorNotificationToast(this.notifications, 'delete', 'log type', deleteRes.error);
    }

    return deleteRes.ok;
  }
}
