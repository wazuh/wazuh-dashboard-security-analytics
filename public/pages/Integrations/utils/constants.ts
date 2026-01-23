/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IntegrationBase } from '../../../../types';

export const integrationDetailsTabs = [
  {
    id: 'details',
    name: 'Details',
  },
  {
    id: 'detection_rules',
    name: 'Detection rules',
  },
];

export const defaultIntegration: IntegrationBase = {
  name: '',
  description: '',
  source: 'Custom',
  tags: null,
  category: '',
};

export const integrationLabels: { [value: string]: string } = {
  cloudtrail: 'AWS Cloudtrail',
  dns: 'DNS',
  vpcflow: 'VPC Flow',
  ad_ldap: 'AD/LDAP',
  apache_access: 'Apache Access',
  m365: 'Microsoft 365',
  okta: 'Okta',
  waf: 'WAF',
  s3: 'AWS S3',
  github: 'Github',
  gworkspace: 'Google Workspace',
  windows: 'Microsoft Windows',
  network: 'Network',
  linux: 'Linux System Logs',
  azure: 'Microsoft Azure',
};
