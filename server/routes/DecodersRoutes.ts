/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { NodeServices } from '../models/interfaces';
import { API } from '../utils/constants';
import { createQueryValidationSchema } from '../utils/helpers';

export function setupDecodersRoutes(services: NodeServices, router: IRouter) {
  const { decodersService } = services;

  router.post(
    {
      path: `${API.DECODERS_BASE}/_search`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema({
          space: schema.maybe(schema.string()),
        }),
      },
    },
    decodersService.searchDecoders
  );

  router.get(
    {
      path: `${API.DECODERS_BASE}/{decoderId}`,
      validate: {
        params: schema.object({
          decoderId: schema.string(),
        }),
        query: createQueryValidationSchema({
          space: schema.maybe(schema.string()),
        }),
      },
    },
    decodersService.getDecoder
  );
}
