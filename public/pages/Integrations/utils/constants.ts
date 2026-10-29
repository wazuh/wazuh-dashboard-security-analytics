/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IntegrationBase } from '../../../../types';

export const OVERVIEW_TAB = {
  INTEGRATIONS: 'integrations',
  FILTERS: 'filters',
} as const;

export type OverviewTabId = (typeof OVERVIEW_TAB)[keyof typeof OVERVIEW_TAB];

export const INTEGRATION_DETAILS_TAB = {
  DETAILS: 'details',
  DETECTION_RULES: 'detection_rules',
  DECODERS: 'decoders',
  KVDBS: 'kvdbs',
} as const;

export type IntegrationDetailsTabId =
  (typeof INTEGRATION_DETAILS_TAB)[keyof typeof INTEGRATION_DETAILS_TAB];

export const INTEGRATION_TAB_PARAM = 'tab';

// Wazuh: promoting a space or enabling an integration is applied asynchronously, so its
// success toast says so and stays on screen long enough to be read.
export const CHANGES_APPLY_DELAY_NOTICE =
  'It can take a few minutes for the changes to apply. Wait before you test them.';
export const CHANGES_APPLY_DELAY_TOAST_LIFE_TIME_MS = 15000;

export const integrationDetailsTabs = [
  {
    id: INTEGRATION_DETAILS_TAB.DETAILS,
    name: 'Details',
  },
  {
    id: INTEGRATION_DETAILS_TAB.DETECTION_RULES,
    name: 'Rules',
  },
  {
    id: INTEGRATION_DETAILS_TAB.DECODERS,
    name: 'Decoders',
  },
  {
    id: INTEGRATION_DETAILS_TAB.KVDBS,
    name: 'KVDBs',
  },
];

export enum IntegrationMode {
  Protected = 'protected',
  UserManaged = 'user-managed',
}

export const defaultIntegration: IntegrationBase = {
  document: {
    id: '',
    enabled: true,
    category: '',
    mode: IntegrationMode.UserManaged,
    metadata: {
      title: '',
      author: '',
      date: '',
      modified: '',
      description: '',
      references: [],
      documentation: '',
      supports: [],
    },
    tags: null,
  },
  space: {
    name: '',
  },
};
