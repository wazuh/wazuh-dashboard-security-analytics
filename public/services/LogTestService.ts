/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { HttpSetup } from "opensearch-dashboards/public";
import {
    ServerResponse,
} from "../../types";
import { API } from "../../server/utils/constants";

export default class LogTestService {
    constructor(private httpClient: HttpSetup) { }

    test = async (
        params: any,
    ): Promise<ServerResponse<any>> // TODO: UPDATE WITH ACTUAL TYPE=> {
        const url = `..${API.LOG_TEST_BASE}`;
    return(await this.httpClient.post(url, {
        body: JSON.stringify(params ?? {}),
    })) as ServerResponse<any> // TODO: UPDATE WITH ACTUAL TYPE;
    };
}
