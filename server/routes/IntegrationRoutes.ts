/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { NodeServices } from '../models/interfaces';
import { API } from '../utils/constants';
import { createQueryValidationSchema } from '../utils/helpers';
import { SpaceTypes } from '../../common/constants';

export function setupIntegrationRoutes(services: NodeServices, router: IRouter) {
  const { integrationService } = services;

  router.post(
    {
      path: API.INTEGRATION_BASE,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.createIntegration
  );

  router.post(
    {
      path: `${API.INTEGRATION_BASE}/_search`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.searchIntegrations
  );

  router.put(
    {
      path: `${API.INTEGRATION_BASE}/{integrationId}`,
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.updateIntegration
  );

  router.get(
    {
      path: `${API.INTEGRATION_BASE}/promote/{space}`,
      validate: {
        params: schema.object({
          space: schema.oneOf([
            schema.literal(SpaceTypes.DRAFT.value),
            schema.literal(SpaceTypes.TESTING.value),
          ]),
        }),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.getPromoteBySpace
  );

  router.post(
    {
      path: `${API.INTEGRATION_BASE}/promote`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.promoteIntegration
  );

  router.delete(
    {
      path: `${API.INTEGRATION_BASE}/{integrationId}`,
      validate: {
        params: schema.object({
          integrationId: schema.string(),
        }),
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    integrationService.deleteIntegration
  );
}
