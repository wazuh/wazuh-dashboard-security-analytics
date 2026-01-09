/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_RULE_UUID = '25b9c01c-350d-4b95-bed1-836d04a4f324';

export enum ThreatIntelIocSourceType {
  S3_CUSTOM = 'S3_CUSTOM',
  IOC_UPLOAD = 'IOC_UPLOAD',
  URL_DOWNLOAD = 'URL_DOWNLOAD',
}

export const SpaceTypes = {
  STANDARD: {
    label: 'Standard',
    value: 'standard',
  },
  CUSTOM: {
    label: 'Custom',
    value: 'custom',
  },
  TESTING: {
    label: 'Testing',
    value: 'testing',
  },
  DRAFT: {
    label: 'Draft',
    value: 'draft',
  },
} as const;