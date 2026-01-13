/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { IRouter } from "opensearch-dashboards/server";
import { schema } from "@osd/config-schema";
import { NodeServices } from "../models/interfaces";
import { API } from "../utils/constants";
import { createQueryValidationSchema } from "../utils/helpers";

export function setupKVDBsRoutes(services: NodeServices, router: IRouter) {
  const { kvdbsService } = services;

  router.post(
    {
      path: `${API.KVDBS_BASE}/_search`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    kvdbsService.searchKVDBs,
  );

  router.post(
    {
      path: `${API.KVDBS_BASE}/_integrations`,
      validate: {
        body: schema.any(),
        query: createQueryValidationSchema(),
      },
    },
    kvdbsService.searchIntegrations,
  );
}
