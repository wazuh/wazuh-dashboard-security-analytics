/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash';
import { DEFAULT_METRICS_COUNTER } from '../server/utils/constants';
import { MetricsCounter, PartialMetricsCounter, PromoteSpaces, Space } from '../types';
import { SecurityAnalyticsPluginConfigType } from '../config';
import { Get, Set } from '../../../src/plugins/opensearch_dashboards_utils/common';

// Wazuh
import { AllowedActionsBySpace, SPACE_ACTIONS, SpaceTypes, UserSpacesOrder } from './constants';

export function aggregateMetrics(
  metrics: PartialMetricsCounter,
  currentMetricsCounter: PartialMetricsCounter
): MetricsCounter {
  const partialMetrics: PartialMetricsCounter = {
    ...currentMetricsCounter,
  };
  Object.keys(metrics).forEach((w) => {
    const workflow = w as keyof MetricsCounter;
    const workFlowMetrics = metrics[workflow];

    if (workFlowMetrics) {
      const counterToUpdate: any =
        partialMetrics[workflow] || _.cloneDeep(DEFAULT_METRICS_COUNTER[workflow]);
      Object.entries(workFlowMetrics).forEach(([metric, count]) => {
        if (!counterToUpdate[metric]) {
          counterToUpdate[metric] = 0;
        }
        counterToUpdate[metric] += count;
      });

      partialMetrics[workflow] = counterToUpdate;
    }
  });

  return partialMetrics as MetricsCounter;
}

let securityAnalyticsPluginConfig: SecurityAnalyticsPluginConfigType;
export const setSecurityAnalyticsPluginConfig = (config: SecurityAnalyticsPluginConfigType) => {
  securityAnalyticsPluginConfig = config;
};

export const getSecurityAnalyticsPluginConfig = (): SecurityAnalyticsPluginConfigType | undefined =>
  securityAnalyticsPluginConfig;

export function extractFieldsFromMappings(
  properties: any,
  fields: string[],
  parentField: string = ''
) {
  Object.keys(properties).forEach((field) => {
    if (properties[field].hasOwnProperty('properties')) {
      extractFieldsFromMappings(
        properties[field]['properties'],
        fields,
        parentField ? `${parentField}.${field}` : field
      );
    } else {
      fields.push(parentField ? `${parentField}.${field}` : field);
    }
  });
}

export function createNullableGetterSetter<T>(): [Get<T | undefined>, Set<T>] {
  let value: T;

  const get = () => {
    return value;
  };

  const set = (newValue: T) => {
    value = newValue;
  };

  return [get, set];
}

// Wazuh
export function actionIsAllowedOnSpace(
  space: Space,
  action: string,
  allowedActionsBySpace = AllowedActionsBySpace
): boolean {
  return allowedActionsBySpace?.[SpaceTypes[space.toUpperCase()]?.value]?.includes(action);
}

export function getSpacesAllowAction(
  action: string,
  allowedActionsBySpace = AllowedActionsBySpace
): Space[] {
  return Object.entries(allowedActionsBySpace)
    .filter(([_, allowedActions]) => allowedActions.includes(action))
    .map(([space]) => space) as Space[];
}

/** Localized label for a space value (from {@link SpaceTypes}). */
export function getSpaceTypeLabel(space: Space): string {
  const key = space.toUpperCase() as keyof typeof SpaceTypes;
  return SpaceTypes[key]?.label ?? space;
}

export const getNextSpace = (space: PromoteSpaces) => {
  const currentIndex = UserSpacesOrder.indexOf(space);
  if (currentIndex === -1 || currentIndex === UserSpacesOrder.length - 1) {
    return null; // No next space available
  }
  return UserSpacesOrder[currentIndex + 1];
};

// Wazuh: the space content is promoted from, so a space that cannot create content can
// still say where its content comes from.
export const getPreviousSpace = (space: PromoteSpaces) => {
  const currentIndex = UserSpacesOrder.indexOf(space);
  if (currentIndex <= 0) {
    return null;
  }
  return UserSpacesOrder[currentIndex - 1];
};

// Wazuh: escapes a free-text fragment for an OpenSearch `wildcard` value. `*` stays
// live so `apache*log` works; `?` and `\` are escaped, since they carry no meaning
// for the user and occur in ordinary titles. Shared by the client query builders and
// the server integration-name joins, so one search text has one meaning per request.
export const escapeWildcard = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\?/g, '\\?');

// Wazuh: why a create/delete action is unavailable in a space, as the tooltip text of the
// disabled control. Test and Custom receive content only through promotion, so the reason
// names the way out (do it in Draft and promote) instead of only stating the restriction.
// `entity` is the plural noun of the list, e.g. "rules". Returns `undefined` when the
// action is allowed, so the result can feed `toolTipContent` directly.
export const getBlockedSpaceActionReason = (
  space: Space,
  action:
    | typeof SPACE_ACTIONS.CREATE
    | typeof SPACE_ACTIONS.EDIT
    | typeof SPACE_ACTIONS.DELETE
    | typeof SPACE_ACTIONS.REARRANGE_INTEGRATIONS
    | typeof SPACE_ACTIONS.EDIT_POLICY
    | typeof SPACE_ACTIONS.CLEAR_SPACE,
  entity: string,
  allowedActionsBySpace = AllowedActionsBySpace
): string | undefined => {
  if (actionIsAllowedOnSpace(space, action, allowedActionsBySpace)) {
    return undefined;
  }

  const draftSpace = SpaceTypes.DRAFT.value;
  const isPromotable = getPreviousSpace(space as PromoteSpaces) !== null;

  // Space-level actions read as whole sentences rather than the "<Entities> ... change"
  // template of the entity lists (`entity` is not used for them).
  if (action === SPACE_ACTIONS.EDIT_POLICY) {
    return isPromotable
      ? `The space policy of the ${space} space changes only through promotion. To change it, edit the policy in the ${draftSpace} space and promote the change.`
      : `The space policy cannot be edited in the ${space} space.`;
  }
  if (action === SPACE_ACTIONS.CLEAR_SPACE) {
    return isPromotable
      ? `Only the ${draftSpace} space can be cleared. The ${space} space changes only through promotion.`
      : `Only the ${draftSpace} space can be cleared.`;
  }

  if (isPromotable) {
    const change = {
      [SPACE_ACTIONS.CREATE]: `To add one, create it in the ${draftSpace} space and promote it.`,
      [SPACE_ACTIONS.EDIT]: `To change one, edit it in the ${draftSpace} space and promote the change.`,
      [SPACE_ACTIONS.DELETE]: `To remove one, delete it in the ${draftSpace} space and promote the change.`,
      [SPACE_ACTIONS.REARRANGE_INTEGRATIONS]: `To change the order, rearrange them in the ${draftSpace} space and promote the change.`,
    }[action];
    const subject = `${entity.charAt(0).toUpperCase()}${entity.slice(1)}`;
    return `${subject} in the ${space} space change only through promotion. ${change}`;
  }

  const verb = action === SPACE_ACTIONS.REARRANGE_INTEGRATIONS ? 'rearrange' : action;
  return `Cannot ${verb} ${entity} in the ${space} space.`;
};
