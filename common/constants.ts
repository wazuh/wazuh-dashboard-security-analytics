/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { wazuh } from '../package.json';
import { IntegrationDocumentCreate } from '../types';
import { i18n } from '@osd/i18n';
import { PromoteSpaces } from '../types';

export const DEFAULT_RULE_UUID = '25b9c01c-350d-4b95-bed1-836d04a4f324';

export const WAZUH_VERSION = wazuh.version;

export const PLUGIN_VERSION_SHORT = WAZUH_VERSION.split('.').splice(0, 2).join('.');

export const DOCUMENTATION_WEB_BASE_URL = 'https://documentation.wazuh.com';

export enum ThreatIntelIocSourceType {
  S3_CUSTOM = 'S3_CUSTOM',
  IOC_UPLOAD = 'IOC_UPLOAD',
  URL_DOWNLOAD = 'URL_DOWNLOAD',
}

export const SpaceTypes = {
  DRAFT: {
    label: i18n.translate('securityAnalytics.spaceTypes.draftLabel', {
      defaultMessage: 'Draft',
    }),
    value: 'draft',
    description: i18n.translate('securityAnalytics.spaceTypes.draftDescription', {
      defaultMessage:
        'Environment where integrations, decoders, rules and KVDBs are created and modified. Not active in the engine.',
    }),
  },
  TEST: {
    label: i18n.translate('securityAnalytics.spaceTypes.testLabel', {
      defaultMessage: 'Test',
    }),
    value: 'test',
    description: i18n.translate('securityAnalytics.spaceTypes.testDescription', {
      defaultMessage:
        'Validation environment used to test integrations, decoders, rules and KVDBs in the engine.',
    }),
  },
  CUSTOM: {
    label: i18n.translate('securityAnalytics.spaceTypes.customLabel', {
      defaultMessage: 'Custom',
    }),
    value: 'custom',
    description: i18n.translate('securityAnalytics.spaceTypes.customDescription', {
      defaultMessage:
        'Production environment holding the user-defined content that is active and applied to all incoming events.',
    }),
  },
  STANDARD: {
    label: i18n.translate('securityAnalytics.spaceTypes.standardLabel', {
      defaultMessage: 'Standard',
    }),
    value: 'standard',
    description: i18n.translate('securityAnalytics.spaceTypes.standardDescription', {
      defaultMessage:
        // Wazuh: not read-only. Its content cannot be created, edited or deleted, but
        // integrations can be disabled and their policy adjusted.
        'Space holding the default integrations, decoders and rules shipped with Wazuh. Its content cannot be edited or deleted, though integrations can be disabled.',
    }),
  },
} as const;

// Wazuh: log test runs against the engine, and draft content is never loaded there.
export const DRAFT_UNAVAILABLE_IN_LOG_TEST = i18n.translate(
  'securityAnalytics.logTest.draftUnavailable',
  {
    defaultMessage:
      'Draft content is not loaded into the engine. Promote it to test to run it here.',
  }
);

export const SPACE_SELECTOR_LABEL = i18n.translate('securityAnalytics.spaceSelector.label', {
  defaultMessage: 'Space:',
});

export const SPACE_ACTIONS = {
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  PROMOTE: 'promote',
  DEFINE_ROOT_DECODER: 'define_root_decoder',
  REARRANGE_INTEGRATIONS: 'rearrange_integrations',
  DISABLE_INTEGRATIONS: 'disable_integrations',
  EDIT_POLICY: 'edit_policy',
  EDIT_POLICY_INDEXING_SETTINGS: 'edit_policy_indexing_settings',
  EDIT_POLICY_ENRICHMENTS: 'edit_enrichments',
  CLEAR_SPACE: 'clear_space',
};

export const AllowedActionsBySpace = {
  [SpaceTypes.DRAFT.value]: [
    SPACE_ACTIONS.CREATE,
    SPACE_ACTIONS.EDIT,
    SPACE_ACTIONS.DELETE,
    SPACE_ACTIONS.PROMOTE,
    SPACE_ACTIONS.DEFINE_ROOT_DECODER,
    SPACE_ACTIONS.REARRANGE_INTEGRATIONS,
    SPACE_ACTIONS.EDIT_POLICY,
    SPACE_ACTIONS.EDIT_POLICY_INDEXING_SETTINGS,
    SPACE_ACTIONS.EDIT_POLICY_ENRICHMENTS,
    SPACE_ACTIONS.CLEAR_SPACE,
    SPACE_ACTIONS.DISABLE_INTEGRATIONS,
  ],
  [SpaceTypes.TEST.value]: [SPACE_ACTIONS.PROMOTE],
  [SpaceTypes.CUSTOM.value]: [],
  [SpaceTypes.STANDARD.value]: [
    SPACE_ACTIONS.DISABLE_INTEGRATIONS,
    SPACE_ACTIONS.EDIT_POLICY_ENRICHMENTS,
    SPACE_ACTIONS.EDIT_POLICY_INDEXING_SETTINGS,
  ],
};

export const FiltersAllowedActionsBySpace = {
  [SpaceTypes.DRAFT.value]: [
    SPACE_ACTIONS.CREATE,
    SPACE_ACTIONS.EDIT,
    SPACE_ACTIONS.DISABLE_INTEGRATIONS,
    SPACE_ACTIONS.DELETE,
  ],
  [SpaceTypes.TEST.value]: [],
  [SpaceTypes.CUSTOM.value]: [],
  [SpaceTypes.STANDARD.value]: [
    SPACE_ACTIONS.CREATE,
    SPACE_ACTIONS.EDIT,
    SPACE_ACTIONS.DISABLE_INTEGRATIONS,
    SPACE_ACTIONS.DELETE,
  ],
};

export const UserSpacesOrder: PromoteSpaces[] = [
  SpaceTypes.DRAFT.value,
  SpaceTypes.TEST.value,
  SpaceTypes.CUSTOM.value,
];

export const defaultIntegration: { document: IntegrationDocumentCreate } = {
  document: {
    title: '',
    description: '',
    documentation: '',
    tags: null,
    category: '',
    author: '',
  },
};
