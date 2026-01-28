/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    IOpenSearchDashboardsResponse,
    OpenSearchDashboardsRequest,
    OpenSearchDashboardsResponseFactory,
    RequestHandlerContext,
    ResponseError,
} from 'opensearch-dashboards/server';
import { ServerResponse } from '../models/types';
import {
    LogTestRequestBody,
    LogTestResponse
} from '../../types';
import { CLIENT_LOG_TEST_METHODS } from '../utils/constants';
import { MDSEnabledClientService } from './MDSEnabledClientService';

export class LogTestService extends MDSEnabledClientService {
    logTest = async (
        context: RequestHandlerContext,
        request: OpenSearchDashboardsRequest<unknown, unknown, LogTestRequestBody>,
        response: OpenSearchDashboardsResponseFactory
    ): Promise<
        IOpenSearchDashboardsResponse<ServerResponse<LogTestResponse> | ResponseError>
    > => {
        try {
            const logTest = request.body.document as LogTestRequestBody;
            const client = this.getClient(request, context);

            if (!logTest.queue || !logTest.location || !logTest.event) {
                return response.custom({
                    statusCode: 200,
                    body: {
                        ok: false,
                        error: 'Missing required fields in the request body.',
                    },
                });
            }


            const logTestResponse: LogTestResponse = await client(
                CLIENT_LOG_TEST_METHODS.TEST_LOG,
                { body: logTest }
            );

            return response.custom({
                statusCode: 200,
                body: {
                    ok: true,
                    response: logTestResponse,
                },
            });
        } catch (error: any) {
            console.error('Security Analytics - LogTestService - logTest:', error);
            return response.custom({
                statusCode: 200,
                body: {
                    ok: false,
                    error: error.message,
                },
            });
        }
    };
}