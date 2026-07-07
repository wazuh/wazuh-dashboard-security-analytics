/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IntegrationBase } from '../../../../types';

export const OVERVIEW_TAB = {
  INTEGRATIONS: 'integrations',
  FILTERS: 'filters',
} as const;

export type OverviewTabId = typeof OVERVIEW_TAB[keyof typeof OVERVIEW_TAB];

export const INTEGRATION_DETAILS_TAB = {
  DETAILS: 'details',
  DETECTION_RULES: 'detection_rules',
  DECODERS: 'decoders',
  KVDBS: 'kvdbs',
} as const;

export type IntegrationDetailsTabId = typeof INTEGRATION_DETAILS_TAB[keyof typeof INTEGRATION_DETAILS_TAB];

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

export const defaultIntegration: IntegrationBase = {
  document: {
    id: '',
    enabled: true,
    category: '',
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

export enum IntegrationMode {
  Protected = 'protected',
  UserManaged = 'user-managed',
}

export const INTEGRATION_MODES: IntegrationMode[] = [
  IntegrationMode.Protected,
  IntegrationMode.UserManaged,
];

export const INTEGRATION_MODE_LABEL: Record<IntegrationMode, string> = {
  [IntegrationMode.Protected]: 'Protected',
  [IntegrationMode.UserManaged]: 'User-managed',
};

export const getIntegrationMode = (mode?: string): IntegrationMode =>
  mode === IntegrationMode.Protected ? IntegrationMode.Protected : IntegrationMode.UserManaged;
