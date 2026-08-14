/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { API } from '../utils/constants';
import { NodeServices } from '../models/interfaces';
import { createQueryValidationSchema } from '../utils/helpers';

export function setupDetectorRoutes(services: NodeServices, router: IRouter) {
  const { detectorsService } = services;

  router.post(
    {
      path: API.DETECTORS_BASE,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    detectorsService.createDetector
  );

  router.get(
    {
      path: `${API.DETECTORS_BASE}/{detectorId}`,
      validate: {
        params: schema.object({
          detectorId: schema.string(),
        }),
        query: createQueryValidationSchema(),
      },
    },
    detectorsService.getDetector
  );

  router.get(
    {
      path: API.COUNT_DETECTORS_BY_INTEGRATION,
      validate: {
        query: createQueryValidationSchema({
          integration: schema.string(),
          space: schema.string(),
        }),
      },
    },
    detectorsService.countDetectorsByIntegration
  );

  router.post(
    {
      path: `${API.SEARCH_DETECTORS}`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    detectorsService.searchDetectors
  );

  router.put(
    {
      path: `${API.DETECTORS_BASE}/{detectorId}`,
      validate: {
        params: schema.object({
          detectorId: schema.string(),
        }),
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    detectorsService.updateDetector
  );

  router.delete(
    {
      path: `${API.DETECTORS_BASE}/{detectorId}`,
      validate: {
        params: schema.object({
          detectorId: schema.string(),
        }),
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    detectorsService.deleteDetector
  );
}
