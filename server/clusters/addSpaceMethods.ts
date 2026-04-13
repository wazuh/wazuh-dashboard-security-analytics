/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { METHOD_NAMES } from '../utils/constants';

const CONTENT_MANAGER_BASE_PATH = '/_plugins/_content_manager';

export function addSpaceMethods(securityAnalytics: any, createAction: any): void {
  securityAnalytics[METHOD_NAMES.DELETE_SPACE] = createAction({
    url: {
      fmt: `${CONTENT_MANAGER_BASE_PATH}/space/<%=space%>`,
      req: {
        space: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: false,
    method: 'DELETE',
  });
}
