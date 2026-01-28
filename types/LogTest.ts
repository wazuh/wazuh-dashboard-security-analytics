/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LogTestRequestBody {
    queue: number;
    location: string;
    agent_metadata?: Record<string, string>;
    event: string;
    trace_level: string;
}

export interface LogTestResponse { }