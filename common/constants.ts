/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { wazuh } from '../package.json';

export const DEFAULT_RULE_UUID = '25b9c01c-350d-4b95-bed1-836d04a4f324';

export const WAZUH_VERSION = wazuh.version;

export const PLUGIN_VERSION_SHORT = WAZUH_VERSION.split('.').splice(0, 2).join('.');


export enum ThreatIntelIocSourceType {
  S3_CUSTOM = 'S3_CUSTOM',
  IOC_UPLOAD = 'IOC_UPLOAD',
  URL_DOWNLOAD = 'URL_DOWNLOAD',
}

export const SpaceTypes = {
  DRAFT: {
    label: 'Draft',
    value: 'draft',
    description: 'Staging area for creating or editing resources before testing',
  },
  TESTING: {
    label: 'Testing',
    value: 'testing',
    description: 'Controlled environment for validation before production',
  },
  CUSTOM: {
    label: 'Custom',
    value: 'custom',
    description: 'Independent space for custom or modified content',
  },
  STANDARD: {
    label: 'Standard',
    value: 'standard',
    description: 'Default KVDBs provided by the system',
  },
} as const;
