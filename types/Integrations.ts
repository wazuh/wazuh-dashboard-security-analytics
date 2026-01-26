/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RuleItemInfoBase } from './Rule';

export interface IntegrationWithRules extends Integration {
  detectionRules: RuleItemInfoBase[];
}

export interface IntegrationItem extends Integration {
  detectionRulesCount: number;
}

export interface Integration extends IntegrationBase {
  id: string;
}

export interface IntegrationBase {
  title: string;
  description: string;
  space: { name: string };
  category: string;
  tags: {
    correlation_id: number;
  } | null;
}

export interface SearchIntegrationsResponse {
  hits: {
    hits: {
      _id: string;
      _source: IntegrationBase;
    }[];
  };
}

export interface CreateIntegrationRequestBody extends IntegrationBase {}

export interface CreateIntegrationResponse {
  _id: string;
  integration: IntegrationBase;
}

export interface UpdateIntegrationParams {
  integrationId: string;
  body: IntegrationBase;
}

export interface UpdateIntegrationResponse {
  _id: string;
  integration: IntegrationBase;
}

export interface DeleteIntegrationParams {
  integrationId: string;
}

export interface DeleteIntegrationResponse {}
