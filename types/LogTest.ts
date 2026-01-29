/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type LogTestTraceLevel = 'NONE' | 'BASIC' | 'FULL';

export interface LogTestRequestBody {
    queue: number;
    location: string;
    agent_metadata?: Record<string, string>;
    event: string;
    trace_level?: LogTestTraceLevel;
}

export interface LogTestAssetTrace {
    asset: string;
    success: boolean;
    traces: string[];
}

export interface LogTestResult {
    output: string;
    asset_traces?: LogTestAssetTrace[];
}

export interface LogTestResponse {
    status: string;
    result: LogTestResult;
}

export interface LogTestApiRequest {
    document: LogTestRequestBody;
    integrationId: string;
}