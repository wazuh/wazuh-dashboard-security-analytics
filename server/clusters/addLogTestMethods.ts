/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { METHOD_NAMES, CONTENT_MANAGER_BASE_PATH } from '../utils/constants';

export function addLogTestMethods(securityAnalytics: any, createAction: any): void {
  securityAnalytics[METHOD_NAMES.TEST_LOG] = createAction({
    url: {
      fmt: `${CONTENT_MANAGER_BASE_PATH}/logtest`,
    },
    needBody: true,
    method: 'POST',
  });

  // Wazuh: the Engine-only half of the pipeline. Needs the space's root decoder.
  securityAnalytics[METHOD_NAMES.TEST_LOG_NORMALIZATION] = createAction({
    url: {
      fmt: `${CONTENT_MANAGER_BASE_PATH}/logtest/normalization`,
    },
    needBody: true,
    method: 'POST',
  });

  // Wazuh: the rules-only half. It never calls the Engine, so it answers even in a
  // space whose Engine environment failed to load.
  securityAnalytics[METHOD_NAMES.TEST_LOG_DETECTION] = createAction({
    url: {
      fmt: `${CONTENT_MANAGER_BASE_PATH}/logtest/detection`,
    },
    needBody: true,
    method: 'POST',
  });
}
