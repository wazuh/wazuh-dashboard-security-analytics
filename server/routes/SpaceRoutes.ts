/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IRouter } from 'opensearch-dashboards/server';
import { schema } from '@osd/config-schema';
import { NodeServices } from '../models/interfaces';
import { API } from '../utils/constants';

export function setupSpaceRoutes(services: NodeServices, router: IRouter) {
  const { spaceService } = services;

  router.delete(
    {
      path: `${API.SPACES_BASE}/{space}`,
      validate: {
        params: schema.object({
          space: schema.string(),
        }),
      },
    },
    spaceService.deleteSpace
  );
}
