/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { API, METHOD_NAMES } from '../utils/constants';

const CONTENT_MANAGER_BASE_PATH = '/_plugins/_content_manager';

export function addLogTestMethods(securityAnalytics: any, createAction: any): void {
    securityAnalytics[METHOD_NAMES.TEST_LOG] = createAction({
        url: {
            fmt: `${CONTENT_MANAGER_BASE_PATH}/logtest/logtest`,
        },
        needBody: true,
        method: 'POST',
    });
}
