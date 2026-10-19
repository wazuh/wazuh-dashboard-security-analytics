/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { NodeServices } from '../models/interfaces';
import { API } from '../utils/constants';
import { createQueryValidationSchema } from '../utils/helpers';

const traceLevelSchema = schema.maybe(
  schema.oneOf([schema.literal('NONE'), schema.literal('ASSET_ONLY'), schema.literal('ALL')])
);

// Wazuh: the raw event fields, shared by the combined and the normalization-only test.
const rawEventFields = {
  queue: schema.number(),
  location: schema.string(),
  metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  event: schema.string(),
  trace_level: traceLevelSchema,
  space: schema.string(),
};

export function setupLogTestRoutes(services: NodeServices, router: IRouter) {
  const { logTestService } = services;

  router.post(
    {
      path: API.LOG_TEST_BASE,
      validate: {
        body: schema.object({
          document: schema.object({
            ...rawEventFields,
            integration: schema.maybe(schema.string()),
          }),
        }),
        query: createQueryValidationSchema(),
      },
    },
    logTestService.logTest
  );

  router.post(
    {
      path: API.LOG_TEST_NORMALIZATION,
      validate: {
        body: schema.object({
          document: schema.object(rawEventFields),
        }),
        query: createQueryValidationSchema(),
      },
    },
    logTestService.normalization
  );

  router.post(
    {
      path: API.LOG_TEST_DETECTION,
      validate: {
        body: schema.object({
          document: schema.object({
            space: schema.string(),
            integration: schema.string({ minLength: 1 }),
            // Wazuh: the normalized event must be an object; the content manager answers
            // "Invalid 'input' format." for anything else, so it is rejected here first.
            input: schema.recordOf(schema.string(), schema.any()),
          }),
        }),
        query: createQueryValidationSchema(),
      },
    },
    logTestService.detection
  );
}
